import { test, expect } from "@playwright/test";

test("議員の一覧→作成→編集→削除", async ({ page }) => {
  const slug = `e2e-politician-${Date.now()}`;
  await page.goto("/politicians");
  await expect(page.getByRole("heading", { name: "議員一覧" })).toBeVisible();
  await page.getByRole("link", { name: "議員を追加" }).click();
  await page.getByLabel("氏名").fill(slug);
  await page.getByLabel("スラッグ").fill(slug);
  await page.getByLabel("当選日").fill("2026-02-08");
  await page.getByLabel("所属").selectOption({ label: "サンプル党" });
  await page.getByRole("button", { name: "作成", exact: true }).click();
  await expect(page).toHaveURL("/politicians");
  const card = page
    .locator('[data-slot="card"]')
    .filter({ has: page.getByRole("heading", { name: slug, exact: true }) });
  await expect(card).toContainText("サンプル党");
  await expect(card).toContainText("2026.02");
  await expect(card.getByRole("link", { name: "年度帳簿" })).toBeVisible();


  await card.getByRole("link", { name: "編集" }).click();
  await expect(page.getByLabel("氏名")).toHaveValue(slug);
  await expect(page.getByLabel("当選日")).toHaveValue("2026-02-08");
  await page.getByLabel("氏名").fill(`${slug}-updated`);
  await page.getByLabel("所属").selectOption("");
  await page.getByRole("button", { name: "更新", exact: true }).click();
  await expect(page).toHaveURL("/politicians");
  const updatedCard = page
    .locator('[data-slot="card"]')
    .filter({ has: page.getByRole("heading", { name: `${slug}-updated`, exact: true }) });
  await expect(updatedCard).toContainText("無所属（政党なし）");
  await updatedCard.getByRole("button", { name: "削除", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "年度帳簿・仕訳・領収書・公開ページもすべて削除されます",
  );
  await page.getByRole("button", { name: "キャンセル", exact: true }).click();
  await expect(updatedCard).toBeVisible();
  await updatedCard.getByRole("button", { name: "削除", exact: true }).click();
  await page.getByRole("button", { name: "削除する", exact: true }).click();
  await expect(updatedCard).toHaveCount(0);
});
