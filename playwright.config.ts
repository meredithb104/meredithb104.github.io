import { defineConfig, devices } from "@playwright/test";

// Runs against the production build (vite preview), not the dev server,
// so what gets audited is what gets deployed. globalSetup rebuilds first
// (outside CI) so that build is never stale, however the tests are launched.
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
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
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] }, grepInvert: /@webkit/ },
    // WebKit as an iPhone, for the specs that opt in with a tag: layout bugs Chromium does not show.
    { name: "webkit-iphone", use: { ...devices["iPhone 14"] }, grep: /@webkit/ },
  ],
});
