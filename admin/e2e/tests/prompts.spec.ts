import { test, expect } from "@playwright/test";

test("デフォルトから初版を保存し、編集して版を重ね、巻き戻す", async ({ page }) => {
  const name = `e2e-prompt-${Date.now()}`;
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

  // 版が無い議員はデフォルトテンプレートから始まり、自動生成部は参照だけできる
  const body = page.getByLabel("プロンプト本文");
  await expect(body).toHaveValue(/迷ったら needs-review/);
  await expect(page.getByText("未保存（デフォルト）")).toBeVisible();
  const details = page.getByText("システムが自動で付加します");
  await expect(details).toBeHidden();
  await page.getByText("自動で付加される部分を見る").click();
  await expect(details).toBeVisible();
  await expect(page.getByText("領収書の抽出結果を次のJSONスキーマに従って")).toBeVisible();

  await page.getByRole("button", { name: "保存して v1 にする" }).click();
  await expect(page.getByText("v1 有効")).toBeVisible();
  const history = page.locator('[data-slot="card"]').filter({ has: page.getByRole("heading", { name: "版履歴" }) }).getByRole("listitem");
  await expect(history).toHaveCount(1);
  await expect(history.first()).toContainText("初版");
  await expect(history.first()).toContainText("0ジョブ");

  // 変更を破棄すると保存済みの本文に戻る
  await body.fill("破棄される本文");
  await page.getByRole("button", { name: "変更を破棄" }).click();
  await expect(body).toHaveValue(/迷ったら needs-review/);

  await body.fill("一行目\n二行目");
  await page.getByRole("button", { name: "保存して v2 にする" }).click();
  await expect(page.getByText("v2 有効")).toBeVisible();
  await expect(history).toHaveCount(2);
  await expect(body).toHaveValue("一行目\n二行目");

  // 巻き戻しは過去版を有効にするだけで、新しい版は作らない
  await history.filter({ hasText: "v1" }).getByRole("button", { name: "巻き戻し" }).click();
  await expect(page.getByText("v1 有効")).toBeVisible();
  await expect(history).toHaveCount(2);
  await expect(body).toHaveValue(/迷ったら needs-review/);
  await expect(page.getByRole("button", { name: "保存して v3 にする" })).toBeVisible();
  await page.reload();
  await expect(page.getByText("v1 有効")).toBeVisible();
});
