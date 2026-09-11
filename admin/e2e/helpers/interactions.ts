import { expect, type Locator } from "@playwright/test";

// 1 回の試行で「クリックが効いたか」を見極める猶予
const ATTEMPT_TIMEOUT = 5_000;
// クリックが効くまで再試行を続ける合計の猶予
const TOTAL_TIMEOUT = 30_000;

/**
 * ハイドレーションが終わるまで押し続ける。
 *
 * SSR された DOM はハイドレーション完了前でもクリックできるように見えるが、
 * まだ React のハンドラが付いていないためクリックは握り潰される。
 * 「手動で仕訳を作成」を押してもダイアログが開かない、「この月を登録」を押しても
 * 「登録済み」にならない、といったランダムな失敗はこれが原因なので、
 * `expectation` が満たされるまでクリックを再試行する。
 *
 * `expectation` にはアサーションのオプション（タイムアウト）が渡される。
 * 1 回の試行を短く切ることで、効かなかったクリックを素早く押し直せる。
 *
 * ```ts
 * await clickUntil(january.getByRole("button", { name: "この月を登録" }), (options) =>
 *   expect(january).toContainText("登録済み", options),
 * );
 * ```
 */
export async function clickUntil(
  target: Locator,
  expectation: (options: { timeout: number }) => Promise<unknown>,
): Promise<void> {
  let attempt = 0;
  await expect(async () => {
    // 直前のクリックが遅れて効いていることがあるので、2 回目以降は押す前に確かめる
    // （押した結果ボタン自体が消える「この月を登録」のような導線で二重クリックしない）
    if (attempt++ > 0 && (await satisfied(expectation))) return;
    await target.click({ timeout: ATTEMPT_TIMEOUT });
    await expectation({ timeout: ATTEMPT_TIMEOUT });
  }).toPass({ timeout: TOTAL_TIMEOUT });
}

async function satisfied(
  expectation: (options: { timeout: number }) => Promise<unknown>,
): Promise<boolean> {
  try {
    await expectation({ timeout: ATTEMPT_TIMEOUT });
    return true;
  } catch {
    return false;
  }
}
