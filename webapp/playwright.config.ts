import { defineConfig, devices } from "@playwright/test";

// E2E は CI と同じ本番ビルド（next build → next start）に対して回す。
// dev サーバー（Turbopack）だと並行実行中もルートの都度ビルドで Fast Refresh が走り、
// 配信中の RSC ストリームが中断されることがある
// （サーバー側 `Error: aborted / ECONNRESET`、ブラウザ側 `Error: Connection closed.`）。
// ページはハードリロードで復帰するものの、その間はハイドレーション前の SSR された DOM が
// クリック可能に見えるため、Playwright のクリックがハンドラの付く前に落ちて握り潰される。
// デバッグで dev サーバーに当てたいときだけ E2E_DEV_SERVER=1 を付ける。
const useDevServer = process.env.E2E_DEV_SERVER === "1";

export default defineConfig({
  testDir: "./e2e/tests",
  outputDir: "./e2e/.output/test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { outputFolder: "./e2e/.output/report" }]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // CI は前段のステップでビルド済みなのでビルドし直さない。
    command: process.env.CI
      ? "pnpm start --port 3000"
      : useDevServer
        ? "pnpm dev"
        : "pnpm build && pnpm start --port 3000",
    url: "http://localhost:3000",
    // 既存のサーバーは dev サーバー指定のときだけ再利用する。
    // 本番ビルドで回す既定では、3000 で動いている dev サーバーを拾って
    // 上記の不安定さに逆戻りしないよう、明示的に止めてもらう。
    reuseExistingServer: useDevServer,
    timeout: 300 * 1000,
  },
});
