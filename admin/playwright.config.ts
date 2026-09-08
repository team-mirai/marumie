import { defineConfig, devices } from "@playwright/test";

// setup プロジェクトで 1 回だけ UI ログインし、各テストは保存した
// storageState を使い回す（spec ごとの beforeEach ログインを廃止）
export const STORAGE_STATE = "e2e/.output/.auth/user.json";

export default defineConfig({
  testDir: "./e2e/tests",
  outputDir: "./e2e/.output/test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { outputFolder: "./e2e/.output/report" }]],
  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: STORAGE_STATE },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: process.env.CI ? "pnpm start --port 3001" : "pnpm dev",
    url: "http://localhost:3001/login",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
