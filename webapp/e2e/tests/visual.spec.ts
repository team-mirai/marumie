import { test, expect, type Page } from "@playwright/test";

// 主要画面の見た目を基準画像（visual.spec.ts-snapshots/）と比べ、崩れたら CI を落とす。
// 依存パッケージ（tailwindcss・apexcharts・@nivo など）の更新を自動マージするときの安全網。
//
// ■ 基準画像は CI（Linux）の描画結果でなければならない
//   フォントの描画が macOS と Linux で違うため、手元の Mac のブラウザで撮った画像は CI と一致しない。
//   そのため Mac で普通に `playwright test` を回したときはこのテストを飛ばす（下の test.skip）。
//   手元で撮り直すときも、ブラウザだけは Linux のものにつなぐ（手順 B）。
//
// ■ 見た目を意図的に変えたときの基準画像の更新手順（どちらか）
//   A. CI の結果から取る（確実）
//      PR の CI で webapp ジョブがこのテストで落ちたら、Artifacts の `webapp-e2e-report` を落とし、
//      `test-results/visual-*/` の `*-actual.png` の差分（`*-diff.png`）が意図どおりか確認してから、
//      `webapp/e2e/tests/visual.spec.ts-snapshots/` の同名ファイル（`-actual` を除いた名前）に上書きしてコミットする。
//   B. 手元で Linux のブラウザを使って撮る（Docker が必要）
//      サーバーは手元で動かし、ブラウザだけを Playwright 公式の Linux イメージで動かす。
//      CI と同じく、シードだけを入れた空の DB・UTC のサーバーで撮ること
//      （admin の E2E が同じ DB に作った政治団体や取引があると数字が変わる）。
//
//        # 1. CI と同じ素の Postgres にマイグレーションとシードを入れる
//        docker run -d --rm --name visual-db -e POSTGRES_PASSWORD=postgres -p 127.0.0.1:55432:5432 postgres:18
//        export DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55432/postgres
//        export DIRECT_URL="$DATABASE_URL"
//        pnpm db:migrate:deploy && SUPABASE_ENV_OPTIONAL=1 pnpm db:seed
//        # 2. Linux のブラウザを起動する（バージョンは webapp の @playwright/test に合わせる）
//        docker run -d --rm --name visual-browser --platform linux/amd64 --init -p 127.0.0.1:53333:3000 \
//          mcr.microsoft.com/playwright:v1.64.1-noble \
//          npx -y playwright@1.64.1 run-server --port 3000 --host 0.0.0.0
//        # 3. UTC のサーバーに対して、Linux のブラウザで撮り直す（webapp/.env.local の Supabase 設定は空で上書きする）
//        TZ=UTC SUPABASE_URL= SUPABASE_SERVICE_ROLE_KEY= \
//          PW_TEST_CONNECT_WS_ENDPOINT=ws://127.0.0.1:53333/ PW_TEST_CONNECT_EXPOSE_NETWORK='<loopback>' \
//          pnpm --filter webapp exec playwright test visual.spec.ts --update-snapshots
//        docker stop visual-db visual-browser
//
// ■ 不安定にしないための約束
//   - 表示がシードの値だけで決まるページ・年度を撮る。政治団体ページは 2025 年度（シードの取引はすべて 2025 年）。
//     現在の年度を撮ると「現時点での貸借対照表」の見出しが年をまたいで変わる
//   - 「YYYY.M.D更新」はシード投入時刻（取引の更新日時）で変わるので、撮る前に固定の文字に置き換える
//   - グラフのアニメーションは toHaveScreenshot が「2 回続けて同じ画像になる」まで待つことで吸収する

const VIEWPORT = { width: 1280, height: 800 };

// 基準画像は Linux の描画結果だけを持つ（playwright.config.ts の snapshotPathTemplate で OS 名を外している）。
// Mac で普通に E2E を回したときは比べられないので飛ばす。手元で Linux のブラウザにつないだとき（手順 B）は回す
test.skip(
  process.platform !== "linux" && !process.env.PW_TEST_CONNECT_WS_ENDPOINT,
  "基準画像は Linux（CI）の描画結果のため、Linux のブラウザでのみ比べる",
);

test.use({
  viewport: VIEWPORT,
  // CI のサーバーとブラウザは UTC。手元の Mac（JST）で撮っても日付がずれないよう固定する
  timezoneId: "UTC",
  locale: "ja-JP",
});

/**
 * 撮影前にページを決定的な状態にそろえる。
 * 遅延読み込みの画像や、画面に入ってから描画される要素を読み込ませるため一度最後までスクロールする。
 */
async function stabilize(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const step = window.innerHeight;
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    window.scrollTo(0, 0);

    // 非表示の要素（SP 用のメニューなど）の loading="lazy" の画像はスクロールしても読み込まれないので、
    // すべて即時読み込みに切り替えてから読み込み完了を待つ
    for (const img of Array.from(document.images)) {
      img.loading = "eager";
    }
    await Promise.all(
      Array.from(document.images)
        .filter((img) => !img.complete)
        .map(
          (img) =>
            new Promise((resolve) => {
              img.addEventListener("load", resolve, { once: true });
              img.addEventListener("error", resolve, { once: true });
            }),
        ),
    );

    // グラフ（@nivo・apexcharts）は JS のアニメーションで描かれ、CSS の animations: "disabled" が効かない。
    // SVG の中身が 1 秒間変わらなくなるまで待つ（最大 20 秒）
    const svgSnapshot = () =>
      Array.from(document.querySelectorAll("svg"))
        .map((svg) => svg.outerHTML)
        .join("");
    let previous = svgSnapshot();
    let stableSince = Date.now();
    const deadline = Date.now() + 20_000;
    while (Date.now() - stableSince < 1_000 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const current = svgSnapshot();
      if (current !== previous) {
        previous = current;
        stableSince = Date.now();
      }
    }

    // 更新日はシードを入れた時刻で変わるので固定の文字にする
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.textContent && /\d{4}\.\d{1,2}\.\d{1,2}更新/.test(node.textContent)) {
        node.textContent = node.textContent.replace(/\d{4}\.\d{1,2}\.\d{1,2}更新/g, "2000.1.1更新");
      }
    }
  });
}

async function expectPageScreenshot(page: Page, name: string) {
  await stabilize(page);
  await expect(page).toHaveScreenshot(name, {
    fullPage: true,
    // グラフの描画が終わるまで待てるよう、既定（5 秒）より長めにとる
    timeout: 15_000,
    // CI でもグラフの線の縁（アンチエイリアス）が実行ごとに数百〜千ピクセルほど揺れる（全体の 0.01% 程度）。
    // 崩れ（要素のずれ・欠け・色の変化）はこれより桁違いに多くのピクセルが変わるので、0.1% までは許す
    maxDiffPixelRatio: 0.001,
  });
}

test.describe("主要画面の見た目", () => {
  test("政治団体ページ", async ({ page }) => {
    await page.goto("/o/sample-party/2025");

    // 収支の流れ（サンキー図）と月ごとの推移のグラフが描画されてから撮る
    await expect(
      page.locator('#cash-flow [role="img"][aria-label="政治資金の収支フロー図"]'),
    ).toBeVisible();
    await expect(page.locator("#monthly-trends svg").first()).toBeVisible();

    await expectPageScreenshot(page, "organization.png");
  });

  test("取引一覧ページ", async ({ page }) => {
    await page.goto("/o/sample-party/2025/transactions");

    await expect(page.locator('table[aria-label="政治資金取引一覧表"]')).toBeVisible();

    await expectPageScreenshot(page, "transactions.png");
  });

  test("調査研究費のページ", async ({ page }) => {
    await page.goto("/p/sample-taro/2026");

    await expect(
      page.locator('[role="img"][aria-label="調査研究費の使いみちの流れ図"]'),
    ).toBeVisible();
    await expect(
      page.locator('#monthly-trends [role="img"][aria-label="月ごとの調査研究費の支給と支出"]'),
    ).toBeVisible();

    await expectPageScreenshot(page, "research-fund.png");
  });
});
