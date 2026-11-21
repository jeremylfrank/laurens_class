import { defineConfig } from "@playwright/test";

const PORT = 3100;

// The classroom board is an Epson BrightLink: a 1920x1080 multi touch surface.
// Every test runs with touch enabled so we catch hover-only or mouse-only UI.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "off",
  },
  projects: [
    {
      name: "board",
      use: {
        browserName: "chromium",
        viewport: { width: 1920, height: 1080 },
        hasTouch: true,
        isMobile: false,
      },
    },
  ],
  webServer: {
    command: `pnpm start --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
