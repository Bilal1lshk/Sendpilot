import { pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";

const SRC_DIR = path.resolve("src");

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const rel = specifier.slice(2);
    const candidate = path.join(SRC_DIR, rel);
    for (const ext of ["", ".ts", ".tsx", ".js", ".mjs"]) {
      const full = candidate + ext;
      if (fs.existsSync(full) && fs.statSync(full).isFile()) {
        return {
          shortCircuit: true,
          url: pathToFileURL(full).href,
        };
      }
    }
  }
  return nextResolve(specifier, context);
}
