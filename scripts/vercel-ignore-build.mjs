import { execFileSync } from "node:child_process";

const previousSha = process.env.VERCEL_GIT_PREVIOUS_SHA;
const currentSha = process.env.VERCEL_GIT_COMMIT_SHA;

if (!previousSha || !currentSha) {
  console.log("Building because Vercel commit metadata is unavailable.");
  process.exit(1);
}

let changedFiles;
try {
  changedFiles = execFileSync(
    "git",
    ["diff", "--name-only", previousSha, currentSha],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  )
    .split(/\r?\n/)
    .filter(Boolean);
} catch (error) {
  console.warn("Building because changed files could not be determined.", error);
  process.exit(1);
}

const workerOnlyPaths = /^(worker\/|scripts\/linkedin-worker\.ts$|Dockerfile$|render\.yaml$)/;
const onlyWorkerFilesChanged =
  changedFiles.length > 0 && changedFiles.every((file) => workerOnlyPaths.test(file));

if (onlyWorkerFilesChanged) {
  console.log("Skipping Vercel build: only Render worker files changed.");
  process.exit(0);
}

console.log("Building because application or shared files changed.");
process.exit(1);
