import http from "node:http";
import { spawn, type ChildProcess } from "node:child_process";
import { extractLinkedInSession, type ExtractedSessionResult } from "@/lib/linkedin-session-extractor";

const PORT = parseInt(process.env.WORKER_PORT || process.env.PORT || "4000", 10);
const HOST = process.env.WORKER_HOST || "0.0.0.0";
const WORKER_SECRET = process.env.LINKEDIN_WORKER_SECRET || process.env.WORKER_SECRET || "";

// Command-line flag parsing
const args = process.argv.slice(2);
const disableTunnel = args.includes("--no-tunnel") || process.env.AUTO_TUNNEL === "false";
const isHeaded = args.includes("--headed") || process.env.HEADLESS === "false";
const useLocaltunnelOnly = args.includes("--lt") || args.includes("--localtunnel") || process.env.TUNNEL_PROVIDER === "localtunnel";
const useCloudflareOnly = args.includes("--cf") || args.includes("--cloudflare") || process.env.TUNNEL_PROVIDER === "cloudflare";

let activeTunnelUrl: string | null = null;
let tunnelProviderName = "Unknown";
let tunnelProcess: ChildProcess | null = null;

function log(level: "INFO" | "WARN" | "ERROR", message: string) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
}

function spawnTool(commandArgs: string[]): ChildProcess {
  if (process.platform === "win32") {
    return spawn("cmd.exe", ["/c", "npx", ...commandArgs], {
      stdio: ["ignore", "pipe", "pipe"],
    });
  }
  return spawn("npx", commandArgs, {
    stdio: ["ignore", "pipe", "pipe"],
  });
}

/**
 * Starts a Localtunnel instance (loca.lt) - reliable fallback when Cloudflare edge is blocked.
 */
function startLocaltunnel(port: number): Promise<string> {
  return new Promise((resolve) => {
    log("INFO", "Initiating Localtunnel (npx localtunnel)...");

    const child = spawnTool(["--yes", "localtunnel", "--port", String(port)]);
    tunnelProcess = child;
    let resolved = false;

    const handleOutput = (data: Buffer) => {
      const text = data.toString();
      const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.loca\.lt/);
      if (match && !resolved) {
        resolved = true;
        activeTunnelUrl = match[0];
        tunnelProviderName = "Localtunnel";
        printBanner(port, activeTunnelUrl, tunnelProviderName);
        resolve(match[0]);
      }
    };

    child.stdout?.on("data", handleOutput);
    child.stderr?.on("data", handleOutput);

    child.on("error", (err) => {
      log("ERROR", `Failed to spawn localtunnel: ${err.message}`);
      if (!resolved) {
        resolved = true;
        resolve("");
      }
    });

    child.on("exit", (code) => {
      log("WARN", `Localtunnel process exited with code ${code}`);
      activeTunnelUrl = null;
    });

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve("");
      }
    }, 15000);
  });
}

/**
 * Starts a Cloudflare Quick Tunnel using `npx cloudflared`.
 */
function startCloudflareTunnel(port: number): Promise<string> {
  return new Promise((resolve) => {
    log("INFO", "Initiating Cloudflare Quick Tunnel (npx cloudflared)...");

    const child = spawnTool(["--yes", "cloudflared", "tunnel", "--url", `http://127.0.0.1:${port}`]);
    tunnelProcess = child;
    let resolved = false;

    const handleOutput = (data: Buffer) => {
      const text = data.toString();
      // Match trycloudflare.com URL while strictly ignoring api.trycloudflare.com
      const match = text.match(/https:\/\/([a-zA-Z0-9-]+)\.trycloudflare\.com/);
      if (match && match[1] !== "api" && !resolved) {
        resolved = true;
        activeTunnelUrl = match[0];
        tunnelProviderName = "Cloudflare Quick Tunnel";
        printBanner(port, activeTunnelUrl, tunnelProviderName);
        resolve(match[0]);
      } else if (text.includes("failed to request quick Tunnel") && !resolved) {
        log("WARN", "Cloudflare quick tunnel timed out or was blocked by network filter.");
        try { child.kill(); } catch {}
        resolved = true;
        resolve("");
      }
    };

    child.stdout?.on("data", handleOutput);
    child.stderr?.on("data", handleOutput);

    child.on("error", (err) => {
      log("ERROR", `Failed to spawn cloudflared: ${err.message}`);
      if (!resolved) {
        resolved = true;
        resolve("");
      }
    });

    child.on("exit", (code) => {
      if (!resolved) {
        resolved = true;
        resolve("");
      }
      activeTunnelUrl = null;
    });

    // Timeout safety fallback: if Cloudflare hangs on regional ISP firewall
    setTimeout(() => {
      if (!resolved) {
        log("WARN", "Cloudflare quick tunnel did not respond within 8 seconds.");
        try { child.kill(); } catch {}
        resolved = true;
        resolve("");
      }
    }, 8000);
  });
}

/**
 * Starts a Serveo SSH tunnel (serveo.net) - rock-solid, zero gateway timeouts (supports long-running logins),
 * and connects natively via OpenSSH built into Windows.
 */
function startServeoTunnel(port: number): Promise<string> {
  return new Promise((resolve) => {
    log("INFO", "Initiating SSH Tunnel via Serveo (serveo.net)...");

    const child = spawn(
      "ssh",
      [
        "-o", "StrictHostKeyChecking=no",
        "-o", "ServerAliveInterval=30",
        "-R", `80:127.0.0.1:${port}`,
        "serveo.net",
      ],
      { stdio: ["ignore", "pipe", "pipe"] }
    );

    tunnelProcess = child;
    let resolved = false;

    const handleOutput = (data: Buffer) => {
      const text = data.toString();
      const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.serveousercontent\.com/);
      if (match && !resolved) {
        resolved = true;
        activeTunnelUrl = match[0];
        tunnelProviderName = "Serveo (SSH Tunnel)";
        printBanner(port, activeTunnelUrl, tunnelProviderName);
        resolve(match[0]);
      }
    };

    child.stdout?.on("data", handleOutput);
    child.stderr?.on("data", handleOutput);

    child.on("error", (err) => {
      log("ERROR", `Failed to spawn ssh: ${err.message}`);
      if (!resolved) {
        resolved = true;
        resolve("");
      }
    });

    child.on("exit", (code) => {
      log("WARN", `Serveo tunnel process exited with code ${code}`);
      activeTunnelUrl = null;
    });

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve("");
      }
    }, 12000);
  });
}

/**
 * Tunnel coordinator: Tries Serveo (SSH) first, then Localtunnel, then Cloudflare.
 */
async function startTunnel(port: number): Promise<string> {
  if (useLocaltunnelOnly) {
    return await startLocaltunnel(port);
  }

  if (useCloudflareOnly) {
    return await startCloudflareTunnel(port);
  }

  // 1. Primary: Serveo (SSH tunnel) - fast, stable, no gateway timeouts
  const serveoUrl = await startServeoTunnel(port);
  if (serveoUrl) return serveoUrl;

  // 2. Secondary: Localtunnel
  log("INFO", "Falling back to Localtunnel...");
  const ltUrl = await startLocaltunnel(port);
  if (ltUrl) return ltUrl;

  // 3. Tertiary: Cloudflare
  log("INFO", "Falling back to Cloudflare...");
  return await startCloudflareTunnel(port);
}

function printBanner(port: number, tunnelUrl: string | null, providerName = "Tunnel") {
  console.log("\n" + "=".repeat(72));
  console.log("   SendPilot LinkedIn Residential Worker");
  console.log("=".repeat(72));
  console.log(`  Local Endpoint:      http://localhost:${port}`);
  if (tunnelUrl) {
    console.log(`  ${providerName.padEnd(20)} \x1b[32m${tunnelUrl}\x1b[0m`);
    console.log("-".repeat(72));
    console.log("  Instructions for Vercel / Remote Production:");
    console.log("  Set the following environment variable in your Vercel Dashboard:");
    console.log(`  \x1b[36mLINKEDIN_WORKER_URL=${tunnelUrl}\x1b[0m`);
    if (WORKER_SECRET) {
      console.log(`  \x1b[36mLINKEDIN_WORKER_SECRET=${WORKER_SECRET}\x1b[0m`);
    }
  } else {
    console.log("  Tunnel:              (Disabled or failed to connect)");
  }
  console.log(`  Browser Mode:        ${isHeaded ? "Visible (Headed)" : "Headless"}`);
  console.log("=".repeat(72) + "\n");
}

const server = http.createServer(async (req, res) => {
  // Common CORS and security headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-worker-secret, Authorization, Bypass-Tunnel-Reminder");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  // 1. Health check & status
  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "healthy",
        service: "sendpilot-linkedin-worker",
        version: "1.0.0",
        uptimeSeconds: Math.floor(process.uptime()),
        tunnelUrl: activeTunnelUrl,
        tunnelProvider: tunnelProviderName,
        mode: isHeaded ? "headed" : "headless",
        timestamp: new Date().toISOString(),
      })
    );
    return;
  }

  // 2. Secret authentication check
  if (WORKER_SECRET) {
    const providedSecret = req.headers["x-worker-secret"];
    if (providedSecret !== WORKER_SECRET) {
      log("WARN", "Unauthorized request rejected: invalid or missing x-worker-secret header.");
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: "Unauthorized: Invalid worker secret." }));
      return;
    }
  }

  // 3. Extract Session Endpoint
  if (req.method === "POST" && url.pathname === "/api/extract-session") {
    let bodyText = "";
    req.on("data", (chunk) => {
      bodyText += chunk;
      // Safety limit: 1MB max body size
      if (bodyText.length > 1024 * 1024) {
        res.writeHead(413, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: "Payload too large" }));
        req.destroy();
      }
    });

    req.on("end", async () => {
      try {
        const body = JSON.parse(bodyText || "{}");
        const {
          email,
          password,
          twoFactorMethod,
          verificationCode,
          pendingChallengeToken,
          existingFingerprint,
        } = body;

        if (!email || !password) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              success: false,
              error: "Missing required 'email' or 'password' parameter.",
            })
          );
          return;
        }

        const maskedEmail = email.replace(/(^.{2})(.*)(@.*)/, "$1***$3");
        log(
          "INFO",
          `Starting extraction for ${maskedEmail} (2FA: ${twoFactorMethod || "otp"}, hasCode: ${Boolean(
            verificationCode
          )})`
        );

        // Run the Playwright session extraction using local residential browser
        const result: ExtractedSessionResult = await extractLinkedInSession({
          email: email.trim(),
          password,
          twoFactorMethod: twoFactorMethod === "app" ? "app" : "otp",
          verificationCode:
            typeof verificationCode === "string" && verificationCode.trim()
              ? verificationCode.trim()
              : undefined,
          pendingChallengeToken:
            typeof pendingChallengeToken === "string" && pendingChallengeToken.trim()
              ? pendingChallengeToken.trim()
              : undefined,
          headless: !isHeaded,
          timeout: 45000,
          existingFingerprint,
          onProgress: (stage) => {
            log("INFO", `[${maskedEmail}] ${stage}`);
          },
        });

        // Determine HTTP response code based on outcome
        let statusCode = 200;
        if (result.proxyError) {
          statusCode = 502;
        } else if (result.requiresTwoFactor) {
          statusCode = 202;
        } else if (!result.success || !result.li_at) {
          statusCode = 400;
        }

        log(
          "INFO",
          `Completed extraction for ${maskedEmail} -> HTTP ${statusCode} (success: ${result.success}, 2FA: ${Boolean(
            result.requiresTwoFactor
          )})`
        );

        res.writeHead(statusCode, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        log("ERROR", `Unhandled exception during session extraction: ${errMsg}`);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: errMsg }));
      }
    });

    return;
  }

  // 404 for unknown endpoints
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Endpoint not found" }));
});

// Start the HTTP server
server.listen(PORT, HOST, async () => {
  log("INFO", `Worker HTTP server listening on http://${HOST}:${PORT}`);
  if (!disableTunnel) {
    await startTunnel(PORT);
  } else {
    printBanner(PORT, null, "Local Only");
  }
});

// Clean termination handlers
function handleShutdown(signal: string) {
  log("INFO", `Received ${signal}. Shutting down worker...`);
  if (tunnelProcess) {
    try {
      tunnelProcess.kill();
    } catch {
      // Ignore child process kill error
    }
  }
  server.close(() => {
    log("INFO", "Server stopped. Exiting.");
    process.exit(0);
  });
}

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));
