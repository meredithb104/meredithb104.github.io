import { defineConfig, devices } from "@playwright/test";

// Runs against the production build (vite preview), not the dev server,
// so what gets audited is what gets deployed.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 1 : 0,
  reporter: process.env["CI"] ? "github" : "list",
  use: {
    baseURL: "http://localhost:4180",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run preview",
    url: "http://localhost:4180",
    reuseExistingServer: !process.env["CI"],
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
