import http from "node:http";
import fs from "node:fs";
import { spawn, type ChildProcess } from "node:child_process";

// Automatically load local .env file
if (fs.existsSync(".env")) {
  try {
    const envContent = fs.readFileSync(".env", "utf8");
    for (const line of envContent.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  } catch {}
}

import { extractLinkedInSession, type ExtractedSessionResult } from "@/lib/linkedin-session-extractor";
import { sendLinkedInMessageWithPlaywright } from "@/lib/playwright-linkedin-messaging";
import { sendLinkedInConnectionWithPlaywright } from "@/lib/playwright-linkedin-connect";
import { extractSearchLeadsWithPlaywright } from "@/lib/playwright-linkedin-extractor";
import { WORKER_CONTRACT_VERSION } from "@/lib/worker-contract";

const PORT = parseInt(process.env.WORKER_PORT || process.env.PORT || "4000", 10);
const HOST = process.env.WORKER_HOST || "0.0.0.0";
const WORKER_SECRET = process.env.LINKEDIN_WORKER_SECRET || "";
const FIXED_LOCALTUNNEL_SUBDOMAIN =
  process.env.WORKER_SUBDOMAIN?.trim() || "sendpilot-bilal-runner";

// Command-line flag parsing
const args = process.argv.slice(2);
const disableTunnel = args.includes("--no-tunnel") || process.env.AUTO_TUNNEL === "false";
const isHeaded = args.includes("--headed") || process.env.HEADLESS === "false";
const useLocaltunnelOnly = args.includes("--lt") || args.includes("--localtunnel") || process.env.TUNNEL_PROVIDER === "localtunnel";
const useCloudflareOnly = args.includes("--cf") || args.includes("--cloudflare") || process.env.TUNNEL_PROVIDER === "cloudflare";

let activeTunnelUrl: string | null = null;
let tunnelProviderName = "Unknown";
let tunnelProcess: ChildProcess | null = null;
let isShuttingDown = false;
let reconnectTimer: NodeJS.Timeout | null = null;

// In-memory cache for successfully extracted sessions (10-minute TTL)
const sessionCache = new Map<string, { result: ExtractedSessionResult; timestamp: number }>();
// In-flight extraction promises to deduplicate overlapping requests during tunnel retries
const inFlightExtractions = new Map<string, Promise<ExtractedSessionResult>>();

function log(level: "INFO" | "WARN" | "ERROR", message: string) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
}

function scheduleTunnelReconnect(port: number) {
  if (isShuttingDown || disableTunnel) return;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(async () => {
    if (isShuttingDown) return;
    log("INFO", "Re-establishing public tunnel connection...");
    await startTunnel(port);
  }, 3000);
}

function persistTunnelUrl(url: string | null) {
  try {
    if (url) {
      fs.writeFileSync(".tunnel-url", url, "utf8");
    } else {
      if (fs.existsSync(".tunnel-url")) fs.unlinkSync(".tunnel-url");
    }
  } catch {}
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

    const expectedTunnelUrl = `https://${FIXED_LOCALTUNNEL_SUBDOMAIN}.loca.lt`;
    const toolArgs = ["--yes", "localtunnel", "--port", String(port)];
    toolArgs.push("--subdomain", FIXED_LOCALTUNNEL_SUBDOMAIN);

    const child = spawnTool(toolArgs);
    tunnelProcess = child;
    let resolved = false;

    const handleOutput = (data: Buffer) => {
      const text = data.toString();
      const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.loca\.lt/);
      if (match && !resolved) {
        if (match[0] !== expectedTunnelUrl) {
          log(
            "ERROR",
            `Localtunnel returned an unexpected URL (${match[0]}); keeping the required URL ${expectedTunnelUrl}.`
          );
          child.kill();
          resolved = true;
          resolve("");
          return;
        }

        resolved = true;
        activeTunnelUrl = expectedTunnelUrl;
        tunnelProviderName = "Localtunnel (Fixed URL)";
        persistTunnelUrl(activeTunnelUrl);
        printBanner(port, activeTunnelUrl, tunnelProviderName);
        resolve(expectedTunnelUrl);
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
      persistTunnelUrl(null);
      scheduleTunnelReconnect(port);
    });

    setTimeout(() => {
      if (!resolved) {
        log("WARN", `Localtunnel did not confirm ${expectedTunnelUrl}; restarting with the same fixed URL.`);
        child.kill();
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
        persistTunnelUrl(activeTunnelUrl);
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
      log("WARN", `Cloudflare tunnel process exited with code ${code}`);
      if (!resolved) {
        resolved = true;
        resolve("");
      }
      activeTunnelUrl = null;
      persistTunnelUrl(null);
      scheduleTunnelReconnect(port);
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

    const customSubdomain = (process.env.WORKER_SUBDOMAIN || process.env.SERVE_SUBDOMAIN || "").trim();
    const remoteForward = customSubdomain ? `${customSubdomain}:80:127.0.0.1:${port}` : `80:127.0.0.1:${port}`;

    const child = spawn(
      "ssh",
      [
        "-o", "StrictHostKeyChecking=no",
        "-o", "TCPKeepAlive=yes",
        "-o", "ServerAliveInterval=10",
        "-o", "ServerAliveCountMax=3",
        "-o", "ExitOnForwardFailure=yes",
        "-R", remoteForward,
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
        persistTunnelUrl(activeTunnelUrl);
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
      persistTunnelUrl(null);
      scheduleTunnelReconnect(port);
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
 * Uses the fixed Localtunnel hostname by default; Cloudflare is available via --cf.
 */
async function startTunnel(port: number): Promise<string> {
  if (useCloudflareOnly) return await startCloudflareTunnel(port);
  if (useLocaltunnelOnly) return await startLocaltunnel(port);

  const customSubdomain = (process.env.WORKER_SUBDOMAIN || process.env.SERVE_SUBDOMAIN || FIXED_LOCALTUNNEL_SUBDOMAIN).trim();
  if (customSubdomain) return await startLocaltunnel(port);

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
    console.log("  SendPilot reads LINKEDIN_WORKER_URL and LINKEDIN_WORKER_SECRET from server environment.");
    console.log("  No tunnel URL entry is required in the UI.");
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
        status: "ok",
        service: "sendpilot-linkedin-worker",
        version: "1.0.0",
        contractVersion: WORKER_CONTRACT_VERSION,
        commit: process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || "local",
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
        const normalizedEmail = email.toLowerCase().trim();

        // Check if session was already extracted recently (e.g. from previous attempt)
        const cached = sessionCache.get(normalizedEmail);
        if (cached && Date.now() - cached.timestamp < 10 * 60 * 1000 && !verificationCode) {
          log("INFO", `[${maskedEmail}] Reusing freshly extracted active session from memory cache (instant response)`);
          const statusCode = cached.result.requiresTwoFactor ? 202 : cached.result.success ? 200 : 400;
          res.writeHead(statusCode, { "Content-Type": "application/json" });
          res.end(JSON.stringify(cached.result));
          return;
        }

        // If an extraction is already running in the background for this account, join that in-flight promise
        const inFlight = inFlightExtractions.get(normalizedEmail);
        if (inFlight && !verificationCode) {
          log("INFO", `[${maskedEmail}] Joining already in-flight browser session extraction (deduplicated)...`);
          try {
            const inFlightResult = await inFlight;
            const statusCode = inFlightResult.requiresTwoFactor ? 202 : inFlightResult.success ? 200 : 400;
            res.writeHead(statusCode, { "Content-Type": "application/json" });
            res.end(JSON.stringify(inFlightResult));
            return;
          } catch {
            // Fall through to fresh launch if in-flight somehow threw
          }
        }

        log(
          "INFO",
          `Starting extraction for ${maskedEmail} (2FA: ${twoFactorMethod || "otp"}, hasCode: ${Boolean(
            verificationCode
          )})`
        );

        // Run the Playwright session extraction using local residential browser
        const extractionPromise = extractLinkedInSession({
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

        if (!verificationCode) {
          inFlightExtractions.set(normalizedEmail, extractionPromise);
        }

        let result: ExtractedSessionResult;
        try {
          result = await extractionPromise;
        } finally {
          inFlightExtractions.delete(normalizedEmail);
        }

        if (result.success || result.requiresTwoFactor) {
          sessionCache.set(normalizedEmail, { result, timestamp: Date.now() });
        }

        const statusCode = result.requiresTwoFactor ? 202 : result.success ? 200 : 400;

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

  // 4. Send Direct Message Endpoint (Automated Follow-ups)
  if (req.method === "POST" && url.pathname === "/api/send-message") {
    let bodyText = "";
    req.on("data", (chunk) => {
      bodyText += chunk;
      if (bodyText.length > 512 * 1024) {
        res.writeHead(413, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: "Payload too large" }));
        req.destroy();
      }
    });

    req.on("end", async () => {
      try {
        const body = JSON.parse(bodyText || "{}");
        const { profileUrl, message, liAtCookie, jSessionId } = body;

        if (!profileUrl || !message || !liAtCookie) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              success: false,
              error: "Missing required 'profileUrl', 'message', or 'liAtCookie' parameter.",
            })
          );
          return;
        }

        log("INFO", `[worker] Automated follow-up dispatch to ${profileUrl}`);
        const result = await sendLinkedInMessageWithPlaywright({
          profileUrl,
          message,
          liAtCookie,
          jSessionId,
        });

        const statusCode = result.success ? 200 : 422;
        log(
          "INFO",
          `[worker] Follow-up status: ${result.status} (success: ${result.success}) for ${profileUrl}`
        );

        res.writeHead(statusCode, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        log("ERROR", `Unhandled exception during send-message: ${errMsg}`);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: errMsg }));
      }
    });

    return;
  }

  // 5. Send Connection Request Endpoint
  if (req.method === "POST" && url.pathname === "/api/send-connection") {
    let bodyText = "";
    req.on("data", (chunk) => {
      bodyText += chunk;
      if (bodyText.length > 512 * 1024) {
        res.writeHead(413, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: "Payload too large" }));
        req.destroy();
      }
    });

    req.on("end", async () => {
      try {
        const body = JSON.parse(bodyText || "{}");
        const { profileUrl, note, liAtCookie, jSessionId } = body;

        if (!profileUrl || !liAtCookie) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              success: false,
              error: "Missing required 'profileUrl' or 'liAtCookie' parameter.",
            })
          );
          return;
        }

        log("INFO", `[worker] Connection request dispatch to ${profileUrl}${note ? " (with custom note)" : ""}`);
        const result = await sendLinkedInConnectionWithPlaywright({
          profileUrl,
          note,
          liAtCookie,
          jSessionId,
        });

        const statusCode = result.success ? 200 : 422;
        log(
          "INFO",
          `[worker] Connection status: ${result.status} (success: ${result.success}) for ${profileUrl}`
        );

        res.writeHead(statusCode, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        log("ERROR", `Unhandled exception during send-connection: ${errMsg}`);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: errMsg }));
      }
    });

    return;
  }

  // 6. Lead Extraction Endpoint (Search URL via residential worker IP)
  if (req.method === "POST" && url.pathname === "/api/extract-leads") {
    let bodyText = "";
    req.on("data", (chunk) => {
      bodyText += chunk;
      if (bodyText.length > 512 * 1024) {
        res.writeHead(413, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: "Payload too large" }));
        req.destroy();
      }
    });

    req.on("end", async () => {
      try {
        const body = JSON.parse(bodyText || "{}");
        const { searchUrl, liAtCookie, jSessionId, maxLeads } = body;

        if (!searchUrl || !liAtCookie) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              leads: [],
              authwallDetected: false,
              error: "Missing required 'searchUrl' or 'liAtCookie' parameter.",
              pagesScraped: 0,
            })
          );
          return;
        }

        log("INFO", `[worker] Extracting leads from search URL: ${searchUrl} (maxLeads: ${maxLeads || 10})`);
        const result = await extractSearchLeadsWithPlaywright({
          searchUrl,
          liAtCookie,
          jSessionId,
          maxLeads: Number(maxLeads) || 10,
        });

        const statusCode = result.leads.length > 0 ? 200 : 422;
        log(
          "INFO",
          `[worker] Lead extraction completed -> ${result.leads.length} leads (pages: ${result.pagesScraped})`
        );

        res.writeHead(statusCode, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        log("ERROR", `Unhandled exception during extract-leads: ${errMsg}`);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ leads: [], authwallDetected: false, error: errMsg, pagesScraped: 0 }));
      }
    });

    return;
  }

  // 404 for unknown endpoints
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Endpoint not found" }));
});

// Self-healing tunnel health monitor
// Localtunnel can silently freeze (SSL renegotiation hangs) without its process exiting.
// This monitor probes the public URL every 30s and force-restarts the tunnel when frozen.
let tunnelHealthCheckTimer: NodeJS.Timeout | null = null;
const TUNNEL_HEALTH_INTERVAL_MS = 30_000;
const TUNNEL_HEALTH_TIMEOUT_MS = 6_000;
let consecutiveTunnelFailures = 0;
const MAX_TUNNEL_FAILURES_BEFORE_RESTART = 2;

async function checkTunnelHealth(): Promise<boolean> {
  if (!activeTunnelUrl || isShuttingDown || disableTunnel) return true;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TUNNEL_HEALTH_TIMEOUT_MS);
    try {
      const res = await fetch(`${activeTunnelUrl}/health`, {
        method: "GET",
        headers: { "Bypass-Tunnel-Reminder": "true", "User-Agent": "SendPilot-TunnelHealthCheck/1.0" },
        signal: controller.signal,
      });
      clearTimeout(timer);
      return res.ok;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return false;
  }
}

async function runTunnelHealthMonitor() {
  if (isShuttingDown || disableTunnel) return;

  const healthy = await checkTunnelHealth();

  if (healthy) {
    consecutiveTunnelFailures = 0;
  } else {
    consecutiveTunnelFailures++;
    log(
      "WARN",
      `Tunnel health check failed (${consecutiveTunnelFailures}/${MAX_TUNNEL_FAILURES_BEFORE_RESTART}): ${activeTunnelUrl}`
    );

    if (consecutiveTunnelFailures >= MAX_TUNNEL_FAILURES_BEFORE_RESTART) {
      consecutiveTunnelFailures = 0;
      log("WARN", "Tunnel appears frozen. Force-killing tunnel process and restarting...");
      if (tunnelProcess) {
        try { tunnelProcess.kill("SIGKILL"); } catch {}
        tunnelProcess = null;
      }
      activeTunnelUrl = null;
      persistTunnelUrl(null);
      // Small delay to let OS clean up the port binding
      await new Promise((r) => setTimeout(r, 1500));
      if (!isShuttingDown) {
        await startTunnel(PORT);
        log("INFO", `Tunnel restarted. New URL: ${activeTunnelUrl || "unknown"}`);
      }
    }
  }

  if (!isShuttingDown && !disableTunnel) {
    tunnelHealthCheckTimer = setTimeout(runTunnelHealthMonitor, TUNNEL_HEALTH_INTERVAL_MS);
  }
}

// Start the HTTP server
server.listen(PORT, HOST, async () => {
  log("INFO", `Worker HTTP server listening on http://${HOST}:${PORT}`);
  if (!disableTunnel) {
    await startTunnel(PORT);
    // Start tunnel health monitor 30s after initial startup
    tunnelHealthCheckTimer = setTimeout(runTunnelHealthMonitor, TUNNEL_HEALTH_INTERVAL_MS);
    log("INFO", `Tunnel self-healing monitor started (checks every ${TUNNEL_HEALTH_INTERVAL_MS / 1000}s).`);
  } else {
    printBanner(PORT, null, "Local Only");
  }
});

// Clean termination handlers
function handleShutdown(signal: string) {
  isShuttingDown = true;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (tunnelHealthCheckTimer) clearTimeout(tunnelHealthCheckTimer);
  persistTunnelUrl(null);
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
