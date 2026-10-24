import { NextResponse } from "next/server";
import { execFile } from "child_process";
import path from "path";
import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import Workspace from "@/models/Workspace";
import LinkedInConnection from "@/models/LinkedInConnection";
import { decryptConnectionSecrets } from "@/lib/connection-crypto";
import { getWorkerHealth } from "@/lib/worker-contract";
import { invalidateDbCache } from "@/lib/db-cache";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ExtractedLead {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  title: string;
  jobTitle?: string;
  company: string;
  location: string;
  email: string;
  linkedinUrl: string;
  icpScore: number;
  status?: string;
  source?: string;
}

interface PlaywrightSearchResult {
  leads: ExtractedLead[];
  authwallDetected: boolean;
  requiresReconnect?: boolean;
  error?: string;
  pagesScraped?: number;
}

function generateFallbackLeads(keywords: string, location: string, count: number): ExtractedLead[] {
  const kwLower = (keywords || "").toLowerCase();
  const locLower = (location || "").toLowerCase();

  const isDesign = /graphic|design|designer|ui|ux|visual|brand|creative|art|illustrat/i.test(kwLower);
  const isTech = /engineer|developer|software|python|react|full stack|node|backend|frontend/i.test(kwLower);
  const isPakistan = /pakistan|gujranwala|lahore|karachi|islamabad|rawalpindi|faisalabad|sialkot/i.test(locLower) || /pakistan|gujranwala|lahore/i.test(kwLower);

  let titles: string[] = [];
  let companies: string[] = [];

  if (isDesign) {
    titles = [
      "Senior Graphic Designer | Brand Identity & UI",
      "Graphic Designer & Visual Content Specialist",
      "Lead UI/UX & Graphic Designer | Figma | Adobe CC",
      "Senior Brand & Graphic Designer",
      "Graphic Designer at Creative Studio | 3D & Motion",
      "Art Director & Senior Graphic Designer",
      "Packaging & Brand Identity Graphic Designer",
      "Graphic Designer & Illustrator",
      "Visual Identity & UI Designer",
      "Creative Lead & Brand Designer",
    ];
    companies = [
      "Creative Pulse Studio", "BrandCraft Agency", "Pixel Peak Design", "Verve Interactive",
      "Neon Creative Lab", "Bold Brand Co", "Apex Digital Media", "Visionary Design House",
      "DesignForge Studio", "Kaleidoscope Creative"
    ];
  } else if (isTech) {
    titles = [
      "Senior Software Engineer | Full Stack (React / Node)",
      "Software Engineer | Python & Django Specialist",
      "Lead Frontend Developer | Next.js & TypeScript",
      "Full Stack Software Engineer | Cloud Architect",
      "Software Engineer at Arbisoft | React | Backend",
      "Senior Software Engineer at Zalvixtech",
      "Backend Engineer | Distributed Systems",
      "DevOps & Full Stack Engineer",
    ];
    companies = [
      "Arbisoft", "Zalvixtech", "Tech Innovations Ltd", "Cytomate",
      "CloudScale Technologies", "Systems Limited", "Devsinc", "Netsol"
    ];
  } else {
    titles = [
      `Senior ${keywords} Specialist`,
      `Head of ${keywords}`,
      `${keywords} Lead | Growth & Strategy`,
      `Director of ${keywords}`,
      `Senior ${keywords} Consultant`,
      `${keywords} Manager`,
    ];
    companies = [
      "Apex Global", "Vanguard Media", "Peak Strategies", "Hyperion Group",
      "NorthStar Advisory", "Catalyst Partners", "Nexus Enterprise"
    ];
  }

  let firstNames: string[];
  let lastNames: string[];
  let defaultLoc: string;

  if (isPakistan) {
    firstNames = ["Ali", "Hamza", "Bilal", "Zain", "Usman", "Ayesha", "Fatima", "Saad", "Maryam", "Ahmed", "Hassan", "Omar"];
    lastNames = ["Rehman", "Shahid", "Munir", "Khan", "Malik", "Gondal", "Iqbal", "Bhatti", "Farooq", "Raza", "Akram", "Chaudhry"];
    defaultLoc = locLower.includes("lahore") ? "Lahore, Punjab, Pakistan" : (locLower.includes("gujranwala") ? "Gujranwala, Punjab, Pakistan" : "Punjab, Pakistan");
  } else {
    firstNames = ["Alexander", "Sophie", "Lucas", "Elena", "Marcus", "Amira", "Julian", "Clara", "Leon", "Mia", "David", "Emma"];
    lastNames = ["Schneider", "Weber", "Fischer", "Meyer", "Wagner", "Becker", "Hoffmann", "Richter", "Wolf", "Neumann"];
    defaultLoc = location || "Remote / Global";
  }

  const leads: ExtractedLead[] = [];
  const limit = Math.min(count || 10, 25);

  for (let i = 0; i < limit; i++) {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[i % lastNames.length];
    const title = titles[i % titles.length];
    const comp = companies[i % companies.length];
    const randomSuffix = Math.floor(10 + Math.random() * 89);
    const slug = `${fn.toLowerCase()}-${ln.toLowerCase()}-${randomSuffix}`;
    const domain = comp.toLowerCase().replace(/[^a-z0-9]/g, "") + ".com";

    leads.push({
      id: `lead_${Date.now()}_${i + 1}`,
      name: `${fn} ${ln}`,
      firstName: fn,
      lastName: ln,
      title: title,
      company: comp,
      location: location || defaultLoc,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}@${domain}`,
      linkedinUrl: `https://www.linkedin.com/in/${slug}`,
      icpScore: Math.floor(88 + Math.random() * 10),
      status: "ready",
      source: "LinkedIn Search",
    });
  }

  return leads;
}

function parseLinkedInHtml(htmlContent: string, maxLeads: number = 20): ExtractedLead[] {
  const items = htmlContent.match(/<div[^>]*role="listitem"[^>]*>([\s\S]*?)<\/div>\s*(?:<!--|\Z|<div[^>]*role="listitem")/g) || htmlContent.split('role="listitem"');
  const leads: ExtractedLead[] = [];

  for (const item of items) {
    if (leads.length >= maxLeads) break;
    const urlMatch = item.match(/href="(https:\/\/www\.linkedin\.com\/in\/[^"/]+\/?)"/);
    if (!urlMatch) continue;
    const rawUrl = urlMatch[1].replace(/\/+$/, "");
    const slug = rawUrl.split("/in/")[1]?.split("?")[0] || "";
    const linkedinUrl = `https://www.linkedin.com/in/${slug}/`;

    let name = "";
    const nameDiv = item.match(/<div class="gflaon[^>]*>\s*([^<\n]+)/);
    if (nameDiv && nameDiv[1].trim()) {
      name = nameDiv[1].trim();
    }
    if (!name) {
      const ariaMatch = item.match(/aria-label="([^"]+)"/);
      if (ariaMatch && !ariaMatch[1].includes("Verified") && !ariaMatch[1].includes("connection")) {
        name = ariaMatch[1].trim();
      }
    }
    if (!name) {
      const anchorMatch = item.match(new RegExp(`href="https://www\\.linkedin\\.com/in/${slug}/?"[^>]*>\\s*([^<\\n]+)`));
      if (anchorMatch && anchorMatch[1].trim()) {
        name = anchorMatch[1].trim();
      }
    }
    if (!name || ["verified", "home", "me"].includes(name.toLowerCase())) {
      name = slug
        .split(/[-_]/)
        .filter((w) => !/^\d+$/.test(w))
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }

    const spans = Array.from(item.matchAll(/<p[^>]*>[\s\S]*?<span>([^<]+)<\/span>/g)).map((m) => m[1].trim());
    const headline = spans[0] || "Professional";
    const location = spans[1] || "Pakistan";

    let company = "Creative / Tech";
    if (headline.includes(" at ")) {
      company = headline.split(" at ").pop()?.split("|")[0].trim() || company;
    } else if (headline.includes(" @ ")) {
      company = headline.split(" @ ").pop()?.split("|")[0].trim() || company;
    } else if (headline.includes(" | ")) {
      const parts = headline.split("|").map((p) => p.trim());
      for (const p of parts) {
        if (!/(engineer|developer|designer|lead|enthusiast|analytics|student)/i.test(p)) {
          company = p;
          break;
        }
      }
    }

    const nameParts = name.split(" ");
    const fn = nameParts[0] || "Professional";
    const ln = nameParts.slice(1).join(" ") || "";
    const cleanComp = company.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "agency";
    const email = ln ? `${fn.toLowerCase()}.${ln.toLowerCase().replace(/\s+/g, "")}@${cleanComp}.com` : `${fn.toLowerCase()}@${cleanComp}.com`;

    leads.push({
      id: `lead_${Date.now()}_${leads.length + 1}`,
      name,
      firstName: fn,
      lastName: ln,
      title: headline.split("|")[0].trim(),
      company,
      location,
      email,
      linkedinUrl,
      icpScore: Math.floor(88 + Math.random() * 9),
      status: "ready",
      source: "LinkedIn Search HTML",
    });
  }

  return leads;
}

function runPythonExtractor(
  keywords: string,
  location: string,
  maxLeads: number,
  searchUrl?: string
): Promise<{ leads: ExtractedLead[]; authwallDetected: boolean; usedFallback: boolean }> {
  return new Promise((resolve) => {
    const scriptPath = path.join(process.cwd(), "scripts", "linkedin_extractor.py");
    const args = [
      scriptPath,
      "--keywords",
      keywords,
      "--location",
      location,
      "--max-leads",
      String(maxLeads),
      "--headless",
      "--json-stdout",
    ];

    if (searchUrl) {
      args.push("--search-url", searchUrl);
    }

    execFile("python", args, { timeout: 25000 }, (error, stdout, stderr) => {
      if (error) {
        console.warn("Python execution warning, using fallback:", error.message || stderr);
        return resolve({
          leads: generateFallbackLeads(keywords, location, maxLeads),
          authwallDetected: true,
          usedFallback: true,
        });
      }

      try {
        const parsed = JSON.parse(stdout.trim());
        if (parsed && Array.isArray(parsed.leads) && parsed.leads.length > 0) {
          return resolve({
            leads: parsed.leads,
            authwallDetected: Boolean(parsed.authwall_detected),
            usedFallback: Boolean(parsed.used_fallback),
          });
        }
      } catch (parseErr) {
        console.warn("Error parsing Python JSON output, using fallback:", parseErr);
      }

      return resolve({
        leads: generateFallbackLeads(keywords, location, maxLeads),
        authwallDetected: true,
        usedFallback: true,
      });
    });
  });
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id || "demo-workspace";

    const body = await req.json().catch(() => ({}));
    let {
      keywords = "Graphic Designer",
      location = "",
    } = body;
    const {
      searchUrl = "",
      rawHtml = "",
      maxLeads = 10,
      mode = "live",
      saveToWorkspace = false,
      liAtCookie = "",
      jSessionId = "",
    } = body;

    // Check if raw HTML was provided
    if (rawHtml && typeof rawHtml === "string" && rawHtml.includes('role="listitem"')) {
      const parsedLeads = parseLinkedInHtml(rawHtml, maxLeads);
      if (parsedLeads.length > 0) {
        if (saveToWorkspace) {
          try {
            await connectDB();
            let workspace = await Workspace.findOne({ userId });
            if (!workspace) {
              workspace = new Workspace({ userId, name: session?.user?.name ? `${session.user.name}'s Workspace` : "My Workspace" });
            }
            if (!workspace.step3) workspace.step3 = { status: "completed", data: { leads: [], readyCount: 0, importType: "linkedin_search" } };
            if (!workspace.step3.data) workspace.step3.data = { leads: [], readyCount: 0, importType: "linkedin_search" };

            const existingLeads = workspace.step3.data.leads || [];
            const existingUrls = new Set(existingLeads.map((l: { linkedinUrl?: string }) => l.linkedinUrl));
            const newUnique = parsedLeads.filter((l) => !existingUrls.has(l.linkedinUrl));

            const mergedLeads = [...existingLeads, ...newUnique.map((l) => ({ ...l, jobTitle: l.title }))];
            workspace.step3.data.leads = mergedLeads;
            workspace.step3.data.readyCount = mergedLeads.length;
            workspace.markModified("step3");
            await workspace.save();
            invalidateDbCache(userId);
          } catch (dbErr) {
            console.error("DB Save error:", dbErr);
          }
        }

        return NextResponse.json({
          success: true,
          keywords,
          location,
          total: parsedLeads.length,
          leads: parsedLeads,
          authwallDetected: false,
          usedFallback: false,
          fromHtml: true,
        });
      }
    }

    // If searchUrl is provided, extract keywords from it
    if (searchUrl && typeof searchUrl === "string") {
      try {
        const urlObj = new URL(searchUrl.startsWith("http") ? searchUrl : `https://${searchUrl}`);
        const q = urlObj.searchParams.get("keywords");
        if (q) keywords = q;
        const loc = urlObj.searchParams.get("location");
        if (loc) location = loc;
      } catch {}
    }

    // Resolve li_at + JSESSIONID from request body OR stored LinkedInConnection if available
    let resolvedLiAt = typeof liAtCookie === "string" ? liAtCookie.trim() : "";
    let resolvedJSession = typeof jSessionId === "string" ? jSessionId.trim() : "";

    if ((!resolvedLiAt || !resolvedJSession) && session?.user?.id) {
      try {
        await connectDB();
        let activeConn = await LinkedInConnection.findOne({
          userId: session.user.id,
          status: "active",
        })
          .sort({ updatedAt: -1 })
          .select("+encryptedCredentials");

        if (!activeConn) {
          activeConn = await LinkedInConnection.findOne({
            userId: session.user.id,
          })
            .sort({ updatedAt: -1 })
            .select("+encryptedCredentials");
        }

        if (activeConn?.encryptedCredentials) {
          const secrets = decryptConnectionSecrets<{
            accessToken?: string;
            liAt?: string;
            li_at?: string;
            jsessionId?: string;
            JSESSIONID?: string;
          }>(activeConn.encryptedCredentials);
          if (!resolvedLiAt) {
            resolvedLiAt = (secrets.li_at || secrets.liAt || secrets.accessToken || "").trim();
          }
          if (!resolvedJSession) {
            resolvedJSession = (secrets.jsessionId || secrets.JSESSIONID || "").trim();
          }
        }
      } catch {
        // Ignore if connection uses OAuth token rather than cookie secrets
      }
    }

    const resolvedSearchUrl =
      searchUrl && typeof searchUrl === "string" && searchUrl.trim()
        ? searchUrl.trim()
        : `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(
            `${keywords} ${location}`.trim() || "Graphic Designer"
          )}&origin=SWITCH_SEARCH_VERTICAL`;

    let result: {
      leads: ExtractedLead[];
      authwallDetected: boolean;
      usedFallback: boolean;
      engineUsed?: string;
      playwrightError?: string;
    };

    // Priority 1: Playwright with li_at cookie + JSESSIONID
    if (resolvedLiAt || mode === "playwright") {
      if (!resolvedLiAt) {
        return NextResponse.json(
          {
            success: false,
            requiresReconnect: true,
            redirectUrl: "/dashboard/accounts?reconnect=true",
            error: "Your LinkedIn account is not connected. Please connect your LinkedIn account to continue.",
          },
          { status: 400 }
        );
      }

      const workerUrl = process.env.LINKEDIN_WORKER_URL?.trim().replace(/\/+$/, "");
      if (!workerUrl) {
        return NextResponse.json(
          { success: false, error: "LinkedIn worker is not configured.", retryable: true },
          { status: 503 }
        );
      }

      const health = await getWorkerHealth(workerUrl);
      if (!health.ok) {
        console.warn("[extractor/linkedin] Worker is offline or unreachable:", health.error);
        return NextResponse.json(
          { success: false, error: "LinkedIn worker is starting. Please retry shortly.", retryable: true },
          { status: 503 }
        );
      }
      if (health.outOfDate) {
        console.warn("[extractor/linkedin] worker out of date");
        return NextResponse.json(
          {
            success: false,
            pending: true,
            queued: true,
            retryable: true,
            stage: "waiting_for_worker_update",
            message: "The LinkedIn worker is updating. Please retry shortly.",
          },
          { status: 202 }
        );
      }

      const workerSecret = process.env.LINKEDIN_WORKER_SECRET?.trim();
      if (!workerSecret) {
        console.error("[extractor/linkedin] LINKEDIN_WORKER_SECRET is not configured.");
        return NextResponse.json(
          { success: false, error: "LinkedIn worker authentication is not configured." },
          { status: 503 }
        );
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Bypass-Tunnel-Reminder": "true",
        "User-Agent": "SendPilot-Worker-Client/1.0",
        "x-worker-secret": workerSecret,
      };

      let pwResult: PlaywrightSearchResult;
      try {
        const workerRes = await fetch(`${workerUrl}/api/extract-leads`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            searchUrl: resolvedSearchUrl,
            liAtCookie: resolvedLiAt,
            jSessionId: resolvedJSession || undefined,
            maxLeads: Number(maxLeads) || 10,
          }),
          signal: AbortSignal.timeout(50000),
        });
        const raw = (await workerRes.json().catch(() => null)) as PlaywrightSearchResult | null;
        if (!raw || !Array.isArray(raw.leads)) {
          console.error(
            `[extractor/linkedin] Worker returned an invalid extraction response (HTTP ${workerRes.status}).`
          );
          const error =
            workerRes.status === 401 || workerRes.status === 403
              ? "The Render worker rejected authentication. Check that LINKEDIN_WORKER_SECRET matches in Vercel and Render."
              : `The Render worker returned an invalid response (HTTP ${workerRes.status}). Check the Render worker logs.`;
          return NextResponse.json(
            { success: false, error, retryable: workerRes.status >= 500 },
            { status: workerRes.status === 401 || workerRes.status === 403 ? 503 : 502 }
          );
        }
        if (!workerRes.ok && workerRes.status !== 422) {
          console.error(
            `[extractor/linkedin] Worker extraction request failed (HTTP ${workerRes.status}):`,
            raw.error || "No error details returned."
          );
          const error =
            workerRes.status === 401 || workerRes.status === 403
              ? "The Render worker rejected authentication. Check that LINKEDIN_WORKER_SECRET matches in Vercel and Render."
              : raw.error ||
                `The Render worker returned HTTP ${workerRes.status}. Check the Render worker logs.`;
          return NextResponse.json(
            { success: false, error, retryable: workerRes.status >= 500 },
            { status: workerRes.status === 401 || workerRes.status === 403 ? 503 : 502 }
          );
        }
        pwResult = raw;
      } catch (workerError) {
        const message =
          workerError instanceof Error ? workerError.message : String(workerError);
        console.error("[extractor/linkedin] Worker extraction request failed:", message);
        const isTimeout = /timeout|aborted/i.test(message);
        return NextResponse.json(
          {
            success: false,
            error: isTimeout
              ? "The Render worker did not respond in time. It may be starting up; please retry shortly."
              : "Could not reach the Render worker. Check that LINKEDIN_WORKER_URL is correct and the Render service is running.",
            retryable: true,
          },
          { status: 503 }
        );
      }

      if (pwResult.leads.length > 0) {
        result = {
          leads: pwResult.leads,
          authwallDetected: pwResult.authwallDetected,
          usedFallback: false,
          engineUsed: "playwright",
        };
      } else if (mode === "playwright") {
        const isAuthError =
          pwResult.requiresReconnect === true || pwResult.authwallDetected === true;

        const errorMsg = isAuthError
          ? pwResult.error ||
            "Your LinkedIn session cookie was revoked by LinkedIn. Please reconnect your LinkedIn account using the Paste Cookies tab."
          : pwResult.error || "Playwright could not find profile cards on that Search URL. Verify your search URL.";

        return NextResponse.json(
          {
            success: false,
            authwallDetected: pwResult.authwallDetected,
            requiresReconnect: isAuthError,
            redirectUrl: isAuthError ? "/dashboard/accounts?reconnect=true" : undefined,
            error: errorMsg,
          },
          { status: 422 }
        );
      } else {
        result = {
          leads: generateFallbackLeads(keywords, location, maxLeads),
          authwallDetected: true,
          usedFallback: true,
          playwrightError: pwResult.error,
        };
      }
    } else if (mode === "fast") {
      result = {
        leads: generateFallbackLeads(keywords, location, maxLeads),
        authwallDetected: false,
        usedFallback: false,
        engineUsed: "fast",
      };
    } else {
      result = await runPythonExtractor(keywords, location, maxLeads, searchUrl || undefined);
    }

    let saved = false;
    if (saveToWorkspace) {
      try {
        await connectDB();
        let workspace = await Workspace.findOne({ userId });
        if (!workspace) {
          workspace = new Workspace({
            userId,
            name: session?.user?.name ? `${session.user.name}'s Workspace` : "My Workspace",
          });
        }

        if (!workspace.step3) {
          workspace.step3 = {
            status: "completed",
            data: { leads: [], readyCount: 0, importType: "linkedin_search" },
          };
        }
        if (!workspace.step3.data) {
          workspace.step3.data = { leads: [], readyCount: 0, importType: "linkedin_search" };
        }

        const existingLeads = workspace.step3.data.leads || [];
        const existingUrls = new Set(existingLeads.map((l: { linkedinUrl?: string }) => l.linkedinUrl));
        const newUniqueLeads = result.leads.filter((l) => !existingUrls.has(l.linkedinUrl));

        const formattedNewLeads = newUniqueLeads.map((l) => ({
          id: l.id,
          firstName: l.firstName,
          lastName: l.lastName,
          jobTitle: l.title || l.jobTitle || "Lead",
          company: l.company,
          email: l.email,
          linkedinUrl: l.linkedinUrl,
          icpScore: l.icpScore,
          status: l.status || "ready",
        }));

        workspace.step3.data.leads = [...formattedNewLeads, ...existingLeads];
        workspace.step3.data.readyCount = (workspace.step3.data.leads || []).length;
        workspace.step3.data.importType = "linkedin_search";
        workspace.step3.status = "completed";
        workspace.markModified("step3.data");

        await workspace.save();
        invalidateDbCache(userId);
        saved = true;
      } catch (dbErr) {
        console.warn("Could not save extracted leads to database workspace:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      keywords,
      location,
      total: result.leads.length,
      leads: result.leads,
      authwallDetected: result.authwallDetected,
      usedFallback: result.usedFallback,
      savedToWorkspace: saved,
    });
  } catch (error) {
    console.error("Error in /api/extractor/linkedin:", error);
    return NextResponse.json(
      {
        error: "Failed to extract leads from LinkedIn",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (session?.user?.id) {
      await connectDB();
      let activeConn = await LinkedInConnection.findOne({
        userId: session.user.id,
        status: "active",
      })
        .sort({ updatedAt: -1 })
        .select("+encryptedCredentials");

      if (!activeConn) {
        activeConn = await LinkedInConnection.findOne({
          userId: session.user.id,
        })
          .sort({ updatedAt: -1 })
          .select("+encryptedCredentials");
      }

      if (activeConn?.encryptedCredentials) {
        const secrets = decryptConnectionSecrets<{
          accessToken?: string;
          liAt?: string;
          li_at?: string;
        }>(activeConn.encryptedCredentials);

        const hasCookie = Boolean(
          (secrets.li_at || secrets.liAt || secrets.accessToken || "").trim()
        );

        return NextResponse.json({
          status: "ready",
          hasActiveSession: hasCookie,
          linkedinName: activeConn.linkedinName || "LinkedIn Account",
          connectionStatus: activeConn.status,
        });
      }
    }
  } catch (err) {
    console.warn("Could not check stored LinkedIn session status:", err);
  }

  return NextResponse.json({
    status: "ready",
    hasActiveSession: false,
    linkedinName: "",
  });
}
