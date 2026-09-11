import { test, expect } from "@playwright/test";

test("手動作成→一覧選択→編集→確認済、月絞り込みと破棄", async ({ page }) => {
  const name = `e2e-journal-${Date.now()}`;
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
  await page.getByRole("link", { name: "仕訳の確認・編集" }).click();
  await expect(page.getByRole("heading", { name: "仕訳の確認・編集" })).toBeVisible();
  for (const [description, date] of [["視察先への移動", "2026-08-01"], ["会議への移動", "2026-09-01"]]) {
    await page.getByRole("button", { name: "手動で仕訳を作成" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("日付", { exact: true }).fill(date);
    await dialog.getByLabel("金額", { exact: true }).fill("1200");
    await dialog.getByLabel("項目名", { exact: true }).fill(description);
    await dialog.getByLabel("科目", { exact: true }).selectOption("taxi");
    await dialog.getByRole("button", { name: "下書きを作成" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("row").filter({ hasText: description })).toBeVisible();
  }
  const row = page.getByRole("row").filter({ hasText: "視察先への移動" });
  await row.click();
  await expect(page.getByLabel("項目名", { exact: true })).toHaveValue("視察先への移動");
  await page.getByLabel("金額", { exact: true }).fill("1500");
  const leaveDialog = page.waitForEvent("dialog");
  await page.evaluate(() => { setTimeout(() => window.location.reload(), 0); });
  const dialog = await leaveDialog;
  expect(dialog.type()).toBe("beforeunload");
  await dialog.dismiss();
  await expect(page.getByLabel("金額", { exact: true })).toHaveValue("1500");
  await page.getByLabel("特記事項（公開される）").fill("視察のため");
  await page.getByLabel("備考", { exact: true }).fill("事務所内の確認メモ");
  await page.getByLabel("備考", { exact: true }).press("ArrowUp");
  await expect(page.getByLabel("項目名", { exact: true })).toHaveValue("視察先への移動");
  await page.getByRole("button", { name: "確認済にする", exact: true }).click();
  await expect(row).toContainText("確認済"); await expect(row).toContainText("1,500");
  await page.reload();
  await row.click();
  await expect(page.getByLabel("備考", { exact: true })).toHaveValue("事務所内の確認メモ");
  await row.focus(); await page.keyboard.press("ArrowUp");
  await expect(page.getByLabel("項目名", { exact: true })).toHaveValue("会議への移動");
  await page.getByLabel("月", { exact: true }).selectOption("08");
  await expect(page.getByRole("row").filter({ hasText: "会議への移動" })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "確認済（1）" })).toBeVisible();
  await page.getByRole("button", { name: "破棄", exact: true }).click();
  await page.getByRole("button", { name: "破棄する", exact: true }).click();
  await expect(row).toHaveCount(0);
  await page.goto("/politicians");
  await politicianCard.getByRole("button", { name: "削除", exact: true }).click();
  await page.getByRole("button", { name: "削除する", exact: true }).click();
  await expect(politicianCard).toHaveCount(0);
});
