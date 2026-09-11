import { test, expect } from "@playwright/test";

test("確認済の仕訳を選んでbefore/afterを見比べ、公開して公開範囲を更新する", async ({ page }) => {
  const year = new Date().getFullYear();
  const name = `e2e-publish-${Date.now()}`;
  await page.goto("/politicians/new");
  await page.getByLabel("氏名").fill(name);
  await page.getByLabel("スラッグ").fill(name);
  await page.getByLabel("当選日").fill(`${year}-01-01`);
  await page.getByRole("button", { name: "作成", exact: true }).click();
  await expect(page).toHaveURL("/politicians");
  const politicianCard = page.locator('[data-slot="card"]').filter({ has: page.getByRole("heading", { name, exact: true }) });
  await politicianCard.getByRole("link", { name: "年度帳簿" }).click();
  await page.getByLabel(/^年度/).fill(String(year));
  await page.getByRole("button", { name: "帳簿を作成" }).click();
  await expect(page.getByRole("heading", { name: `${year}年度` })).toBeVisible();
  await page.getByRole("button", { name: "現在の対象を切り替え" }).click();
  await Promise.all([
    page.waitForNavigation({ waitUntil: "load" }),
    page.getByRole("button", { name: `${name}／${year}年度` }).click(),
  ]);

  // 公開できる材料をつくる: 支給1件（確認済）と、確認済にした支出1件
  await page.getByRole("link", { name: "支給の登録" }).click();
  await expect(page.getByRole("heading", { name: "支給の登録" })).toBeVisible();
  await page.getByRole("listitem").filter({ hasText: "1月" }).first().getByRole("button", { name: "この月を登録" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "1月" }).first()).toContainText("登録済み");
  await page.getByRole("link", { name: "仕訳の確認・編集" }).click();
  await expect(page.getByRole("heading", { name: "仕訳の確認・編集" })).toBeVisible();
  await page.getByRole("button", { name: "手動で仕訳を作成" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("日付", { exact: true }).fill(`${year}-03-15`);
  await dialog.getByLabel("金額", { exact: true }).fill("1500");
  await dialog.getByLabel("項目名", { exact: true }).fill("視察先への移動");
  await dialog.getByLabel("科目", { exact: true }).selectOption("taxi");
  await dialog.getByRole("button", { name: "下書きを作成" }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole("row").filter({ hasText: "視察先への移動" }).click();
  await page.getByRole("button", { name: "確認済にする", exact: true }).click();
  await expect(page.getByRole("row").filter({ hasText: "視察先への移動" })).toContainText("確認済");

  await page.getByRole("link", { name: "公開", exact: true }).click();
  await expect(page.getByRole("heading", { name: "公開" })).toBeVisible();
  await expect(page.getByText("確認済・未公開 2件")).toBeVisible();
  await expect(page.getByRole("button", { name: "公開する仕訳を選んでください" })).toBeDisabled();
  await expect(page.getByText("仕訳を選ぶとこちらが変化します")).toBeVisible();
  await expect(page.getByText("現在の公開状態（未公開）")).toBeVisible();

  // チェックすると after と差分文が即時に変わる
  await page.getByRole("checkbox", { name: "調査研究費 1月分を公開対象にする" }).click();
  await expect(page.getByText("公開すると：未使用 +¥1,000,000")).toBeVisible();
  await page.getByRole("checkbox", { name: "視察先への移動を公開対象にする" }).click();
  await expect(page.getByText("公開すると：タクシー代 +¥1,500・未使用 +¥998,500")).toBeVisible();
  await expect(page.getByText("選択中の 2件 を公開した場合")).toBeVisible();

  const publishButton = page.getByRole("button", { name: "2件（¥1,001,500）を公開する" });
  await expect(publishButton).toBeEnabled();
  await publishButton.click();
  await expect(page.getByText(`2件を公開しました（公開範囲 〜${year}.03.31）`)).toBeVisible();
  await expect(page.getByText("確認済・未公開 0件")).toBeVisible();
  await expect(page.getByText("公開できる確認済の仕訳はありません")).toBeVisible();
  await page.reload();
  await expect(page.getByText(`現在の公開状態（〜${year}.03.31・¥1,500）`)).toBeVisible();

  // 公開済みは仕訳一覧で「公開中」になり、帳簿の公開範囲も更新される
  await page.getByRole("link", { name: "仕訳の確認・編集" }).click();
  await expect(page.getByRole("heading", { name: "仕訳の確認・編集" })).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "視察先への移動" })).toContainText("公開中");
  await page.getByRole("link", { name: "年度帳簿" }).click();
  const bookCard = page.locator('[data-slot="card"]').filter({ has: page.getByRole("heading", { name: `${year}年度` }) });
  await expect(bookCard).toContainText("公開中");
  await expect(bookCard).toContainText(`${year}.03.31まで`);

  await page.goto("/politicians");
  await politicianCard.getByRole("button", { name: "削除", exact: true }).click();
  await page.getByRole("button", { name: "削除する", exact: true }).click();
  await expect(politicianCard).toHaveCount(0);
});
