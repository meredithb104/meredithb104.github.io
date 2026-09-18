import { execSync } from "node:child_process";

/**
 * Build before every Playwright run. The tests audit dist/ through `vite preview`,
 * and a preview server left running from an earlier run keeps serving the old
 * build, so a source change would otherwise go untested until someone rebuilt.
 * CI builds in its own step (the same dist/ is deployed), so it is skipped there.
 */
export default function globalSetup(): void {
  if (process.env["CI"]) return;
  execSync("npm run build", { stdio: "inherit" });
}
