/**
 * Robust CSV parser and validator for SendPilot leads.
 * Handles quoted fields, delimiters, automatic column detection, and hygiene checks.
 */

export interface ParsedCsvLead {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  title: string;
  company: string;
  location: string;
  email: string;
  linkedinUrl: string;
  icpScore: number;
  status: string;
  source: string;
}

export interface CsvParseResult {
  fileName: string;
  headers: string[];
  totalRows: number;
  readyCount: number;
  duplicateCount: number;
  invalidCount: number;
  leads: ParsedCsvLead[];
}

/**
 * Splits a CSV line into fields respecting quotes and escaped characters.
 */
function parseCsvLine(line: string, delimiter: string = ","): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Detects common delimiters: comma, semicolon, tab.
 */
function detectDelimiter(firstLine: string): string {
  const semicolons = (firstLine.match(/;/g) || []).length;
  const tabs = (firstLine.match(/\t/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;

  if (semicolons > commas && semicolons > tabs) return ";";
  if (tabs > commas && tabs > semicolons) return "\t";
  return ",";
}

/**
 * Identifies the best header matching a concept.
 */
function findHeaderIndex(headers: string[], candidates: string[]): number {
  const lowerHeaders = headers.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
  for (const cand of candidates) {
    const cleanCand = cand.toLowerCase().replace(/[^a-z0-9]/g, "");
    const idx = lowerHeaders.findIndex((h) => h === cleanCand || h.includes(cleanCand));
    if (idx !== -1) return idx;
  }
  return -1;
}

/**
 * Parses raw CSV string content into typed ParsedCsvLead objects.
 */
export function parseCsvContent(csvText: string, fileName = "import.csv"): CsvParseResult {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return {
      fileName,
      headers: [],
      totalRows: 0,
      readyCount: 0,
      duplicateCount: 0,
      invalidCount: 0,
      leads: [],
    };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter);

  // Column index lookups
  const fnIdx = findHeaderIndex(headers, ["firstname", "first", "givenname", "fname"]);
  const lnIdx = findHeaderIndex(headers, ["lastname", "last", "surname", "familyname", "lname"]);
  const nameIdx = findHeaderIndex(headers, ["fullname", "name", "contactname", "person"]);
  const titleIdx = findHeaderIndex(headers, ["jobtitle", "title", "position", "role", "headline", "occupation"]);
  const companyIdx = findHeaderIndex(headers, ["company", "companyname", "organization", "account"]);
  const emailIdx = findHeaderIndex(headers, ["workemail", "email", "primaryemail", "emailaddress", "contactemail"]);
  const urlIdx = findHeaderIndex(headers, ["linkedinurl", "linkedin", "profileurl", "profile", "link"]);
  const locIdx = findHeaderIndex(headers, ["location", "city", "country", "region", "state"]);
  const icpIdx = findHeaderIndex(headers, ["icpscore", "score", "match", "fit"]);

  const seenEmails = new Set<string>();
  const seenUrls = new Set<string>();
  const leads: ParsedCsvLead[] = [];
  let duplicateCount = 0;
  let invalidCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i], delimiter);
    if (row.length === 0 || row.every((val) => val === "")) continue;

    let firstName = fnIdx !== -1 ? row[fnIdx] || "" : "";
    let lastName = lnIdx !== -1 ? row[lnIdx] || "" : "";
    let fullName = nameIdx !== -1 ? row[nameIdx] || "" : "";

    if (!fullName && (firstName || lastName)) {
      fullName = `${firstName} ${lastName}`.trim();
    } else if (fullName && (!firstName && !lastName)) {
      const parts = fullName.split(" ");
      firstName = parts[0] || "";
      lastName = parts.slice(1).join(" ") || "";
    }

    const title = titleIdx !== -1 ? row[titleIdx] || "Decision Maker" : "Decision Maker";
    const company = companyIdx !== -1 ? row[companyIdx] || "Enterprise" : "Enterprise";
    const email = emailIdx !== -1 ? row[emailIdx] || "" : "";
    const linkedinUrl = urlIdx !== -1 ? row[urlIdx] || "" : "";
    const location = locIdx !== -1 ? row[locIdx] || "Global" : "Global";

    let icpScore = 88;
    if (icpIdx !== -1 && row[icpIdx]) {
      const parsedScore = parseInt(row[icpIdx].replace(/[^0-9]/g, ""), 10);
      if (!isNaN(parsedScore)) icpScore = parsedScore;
    }

    // Validation: Require at least a name or an email or a linkedin url
    if (!fullName && !email && !linkedinUrl) {
      invalidCount++;
      continue;
    }

    // Deduplication check
    const emailKey = email.toLowerCase().trim();
    const urlKey = linkedinUrl.toLowerCase().trim();

    const isDuplicate =
      (emailKey && seenEmails.has(emailKey)) ||
      (urlKey && seenUrls.has(urlKey));

    if (isDuplicate) {
      duplicateCount++;
      continue;
    }

    if (emailKey) seenEmails.add(emailKey);
    if (urlKey) seenUrls.add(urlKey);

    leads.push({
      id: `csv_lead_${Date.now()}_${i}`,
      name: fullName || (email ? email.split("@")[0] : "Prospect"),
      firstName: firstName || fullName.split(" ")[0] || "Prospect",
      lastName: lastName || fullName.split(" ").slice(1).join(" ") || "",
      title,
      company,
      location,
      email: email || (firstName && lastName ? `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.toLowerCase().replace(/[^a-z0-9]/g, "")}.com` : ""),
      linkedinUrl: linkedinUrl || `https://www.linkedin.com/in/${(firstName || "lead").toLowerCase()}-${i}`,
      icpScore,
      status: "ready",
      source: "CSV Upload",
    });
  }

  return {
    fileName,
    headers,
    totalRows: lines.length - 1,
    readyCount: leads.length,
    duplicateCount,
    invalidCount,
    leads,
  };
}

/**
 * Generates sample CSV template string ready for download.
 */
export function getSampleCsvTemplate(): string {
  const headers = "First Name,Last Name,Job Title,Company,Location,Work Email,LinkedIn Profile URL,ICP Score";
  const rows = [
    "Sarah,Jenkins,VP of Demand Generation,CloudScale Systems,Berlin,sarah.j@cloudscale.io,https://linkedin.com/in/sarahjenkins-cloud,96",
    "Marcus,Chen,Head of Growth,FinFlow Technologies,London,marcus@finflow.co,https://linkedin.com/in/marcus-chen-growth,94",
    "Elena,Rostova,Director of Global Sales,DataPulse AI,San Francisco,elena.r@datapulse.ai,https://linkedin.com/in/elena-rostova-sales,92",
    "David,Miller,Chief Revenue Officer,Vanguard Retail,New York,david.m@vanguardretail.com,https://linkedin.com/in/david-miller-cro,89",
    "Amina,Diallo,VP of Business Development,Apex Logistic,Paris,amina@apexnetworks.com,https://linkedin.com/in/amina-diallo-bizdev,88",
  ];
  return [headers, ...rows].join("\n");
}
