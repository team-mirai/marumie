import { test, expect, type Page } from "@playwright/test";
import { clickUntil } from "../helpers/interactions";

async function openPromptsPage(page: Page, name: string) {
  await page.goto("/politicians/new");
  await page.getByLabel("氏名").fill(name);
  await page.getByLabel("スラッグ").fill(name);
  await page.getByLabel("当選日").fill("2026-02-08");
  await page.getByRole("button", { name: "作成", exact: true }).click();
  await expect(page).toHaveURL("/politicians");
  const politicianCard = page.locator('[data-slot="card"]').filter({ has: page.getByRole("heading", { name, exact: true }) });
  await politicianCard.getByRole("link", { name: "年度帳簿" }).click();
  await page.getByLabel(/^年度/).fill("2026");
  await page.getByRole("button", { name: "帳簿を作成" }).click();
  await expect(page.getByRole("heading", { name: "2026年度" })).toBeVisible();
  await page.getByRole("button", { name: "現在の対象を切り替え" }).click();
  await Promise.all([
    page.waitForNavigation({ waitUntil: "load" }),
    page.getByRole("button", { name: `${name}／2026年度` }).click(),
  ]);
  await page.getByRole("link", { name: "読み取りプロンプト" }).click();
  await expect(page.getByRole("heading", { name: "読み取りプロンプト" })).toBeVisible();
}

test("デフォルトから初版を保存し、編集して版を重ね、巻き戻す", async ({ page }) => {
  await openPromptsPage(page, `e2e-prompt-${Date.now()}`);
  const section = page.getByRole("region", { name: "領収書の読み取り" });

  // 版が無い議員はデフォルトテンプレートから始まり、自動生成部は参照だけできる
  const body = section.getByLabel("プロンプト本文");
  await expect(body).toHaveValue(/迷ったら needs-review/);
  await expect(section.getByText("未保存（デフォルト）")).toBeVisible();
  const details = section.getByText("システムが自動で付加します");
  await expect(details).toBeHidden();
  await section.getByText("自動で付加される部分を見る").click();
  await expect(details).toBeVisible();
  await expect(section.getByText("領収書の抽出結果を次のJSONスキーマに従って")).toBeVisible();

  // 書類が無い帳簿ではテスト実行の select を出さず、アップロードへ促す
  await expect(section.getByRole("heading", { name: "テスト実行" })).toBeVisible();
  await expect(section.getByText("この帳簿にはまだ書類がありません")).toBeVisible();
  await expect(section.getByRole("button", { name: "テスト実行" })).toBeHidden();

  await clickUntil(section.getByRole("button", { name: "保存して v1 にする" }), (options) =>
    expect(section.getByText("v1 有効")).toBeVisible(options),
  );
  const history = section.locator('[data-slot="card"]').filter({ has: page.getByRole("heading", { name: "版履歴" }) }).getByRole("listitem");
  await expect(history).toHaveCount(1);
  await expect(history.first()).toContainText("初版");
  await expect(history.first()).toContainText("0ジョブ");

  // 変更を破棄すると保存済みの本文に戻る
  await body.fill("破棄される本文");
  await section.getByRole("button", { name: "変更を破棄" }).click();
  await expect(body).toHaveValue(/迷ったら needs-review/);

  await body.fill("一行目\n二行目");
  await section.getByRole("button", { name: "保存して v2 にする" }).click();
  await expect(section.getByText("v2 有効")).toBeVisible();
  await expect(history).toHaveCount(2);
  await expect(body).toHaveValue("一行目\n二行目");

  // 巻き戻しは過去版を有効にするだけで、新しい版は作らない
  await history.filter({ hasText: "v1" }).getByRole("button", { name: "巻き戻し" }).click();
  await expect(section.getByText("v1 有効")).toBeVisible();
  await expect(history).toHaveCount(2);
  await expect(body).toHaveValue(/迷ったら needs-review/);
  await expect(section.getByRole("button", { name: "保存して v3 にする" })).toBeVisible();
  await page.reload();
  await expect(section.getByText("v1 有効")).toBeVisible();
});

test("住所検索プロンプトは読み取りプロンプトとは別に版を重ね、巻き戻せる", async ({ page }) => {
  await openPromptsPage(page, `e2e-address-prompt-${Date.now()}`);
  const section = page.getByRole("region", { name: "支払先の住所検索" });
  const receipt = page.getByRole("region", { name: "領収書の読み取り" });

  // 版が無い議員は今の住所検索プロンプトから始まり、名称の差し込みと出力形式は参照だけできる
  const body = section.getByLabel("プロンプト本文");
  await expect(body).toHaveValue(/本社または主たる事務所の住所を特定してください/);
  await expect(body).not.toHaveValue(/【出力形式】/);
  await expect(section.getByText("未保存（デフォルト）")).toBeVisible();
  await section.getByText("自動で付加される部分を見る").click();
  await expect(section.getByText(/会社名: （検索する名称）/)).toBeVisible();
  // 住所検索はスキャンジョブに使われないので、テスト実行は無い
  await expect(section.getByRole("heading", { name: "テスト実行" })).toBeHidden();

  await clickUntil(section.getByRole("button", { name: "保存して v1 にする" }), (options) =>
    expect(section.getByText("v1 有効")).toBeVisible(options),
  );
  // 読み取りプロンプトの版は増えない
  await expect(receipt.getByText("未保存（デフォルト）")).toBeVisible();

  const history = section.locator('[data-slot="card"]').filter({ has: page.getByRole("heading", { name: "版履歴" }) }).getByRole("listitem");
  await expect(history).toHaveCount(1);
  await expect(history.first()).toContainText("初版");
  await expect(history.first()).not.toContainText("ジョブ");

  await body.fill("住所だけを答える");
  await section.getByRole("button", { name: "保存して v2 にする" }).click();
  await expect(section.getByText("v2 有効")).toBeVisible();
  await expect(history).toHaveCount(2);

  await history.filter({ hasText: "v1" }).getByRole("button", { name: "巻き戻し" }).click();
  await expect(section.getByText("v1 有効")).toBeVisible();
  await expect(body).toHaveValue(/本社または主たる事務所の住所を特定してください/);
  await page.reload();
  await expect(section.getByText("v1 有効")).toBeVisible();
  await expect(receipt.getByText("未保存（デフォルト）")).toBeVisible();
});
