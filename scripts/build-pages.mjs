import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const repository = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "creeps";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? (repository.endsWith(".github.io") ? "" : `/${repository}`);
if (basePath && !/^\/[\w.-]+$/.test(basePath)) throw new Error("Invalid Pages base path");
execFileSync(process.execPath, ["node_modules/next/dist/bin/next", "build"], {
  stdio: "inherit",
  env: { ...process.env, STATIC_EXPORT: "1", NEXT_PUBLIC_BASE_PATH: basePath },
});
writeFileSync("out/.nojekyll", "");
writeFileSync("out/pages-build.json", JSON.stringify({ basePath, node: process.version }) + "\n");
