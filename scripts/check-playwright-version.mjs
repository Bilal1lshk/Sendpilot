import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const dockerfile = fs.readFileSync(path.join(root, "Dockerfile"), "utf8");
const versionFromPkg =
  pkg.devDependencies?.playwright || pkg.dependencies?.playwright || "";

if (!versionFromPkg) {
  throw new Error("No Playwright version found in package.json");
}

const normalizedVersion = versionFromPkg.replace(/^[~^]/, "");
const match = dockerfile.match(/mcr\.microsoft\.com\/playwright:v([0-9]+(?:\.[0-9]+)+)-/i);

if (!match) {
  throw new Error("Could not find a Playwright base image tag in Dockerfile");
}

const dockerVersion = match[1];
if (dockerVersion !== normalizedVersion) {
  throw new Error(
    `Dockerfile Playwright version mismatch: Dockerfile has ${dockerVersion}, package.json has ${normalizedVersion}`
  );
}

console.log(`Playwright version OK: ${normalizedVersion}`);
