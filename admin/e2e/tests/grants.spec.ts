import { test, expect } from "@playwright/test";

test("支給をテンプレートから1クリックで確認済登録し、二重生成を拒み、仕訳一覧に並べる", async ({ page }) => {
  const year = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const name = `e2e-grant-${Date.now()}`;
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

  await page.getByRole("link", { name: "支給の登録" }).click();
  await expect(page.getByRole("heading", { name: "支給の登録" })).toBeVisible();
  await expect(page.getByText("借方 普通預金 ／ 貸方 調査研究費収入")).toBeVisible();
  await expect(page.getByText("下書きを経ずに「確認済」で作成されます")).toBeVisible();

  const january = page.getByRole("listitem").filter({ hasText: "1月" }).first();
  await expect(january).toContainText("¥1,000,000");
  await january.getByRole("button", { name: "この月を登録" }).click();
  await expect(january).toContainText("登録済み");
  // 同月の二重生成は拒否される（登録済みの月にボタンは出ない）
  await expect(january.getByRole("button", { name: "この月を登録" })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("listitem").filter({ hasText: "1月" }).first()).toContainText("登録済み");
  if (currentMonth < 12) {
    await expect(page.getByRole("listitem").filter({ hasText: "12月" }).first()).toContainText("未到来");
  }

  await page.getByRole("link", { name: "仕訳の確認・編集" }).click();
  const grantRow = page.getByRole("row").filter({ hasText: "調査研究費 1月分" });
  await expect(grantRow).toContainText("確認済");
  await expect(grantRow).toContainText("支給");
  await expect(grantRow).toContainText("1,000,000");

  await page.goto("/politicians");
  await politicianCard.getByRole("button", { name: "削除", exact: true }).click();
  await page.getByRole("button", { name: "削除する", exact: true }).click();
  await expect(politicianCard).toHaveCount(0);
});
