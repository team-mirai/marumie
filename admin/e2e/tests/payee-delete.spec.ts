import { test, expect } from "@playwright/test";
import { clickUntil, clickBulkAction } from "../helpers/interactions";

// 支払先の削除。公開中の仕訳に紐づく支払先は削除できず、
// それ以外の支払先は削除すると紐づいていた仕訳（下書き・確認済）の支払先が未設定に戻る。
test("公開中の仕訳に紐づく支払先は削除できず、下書きだけに紐づく支払先は紐づけを外して削除できる", async ({ page }) => {
  const year = new Date().getFullYear();
  const name = `e2e-payee-delete-${Date.now()}`;
  await page.goto("/politicians/new");
  await page.getByLabel("氏名").fill(name);
  await page.getByLabel("スラッグ").fill(name);
  await page.getByLabel("当選日").fill(`${year}-01-01`);
  await page.getByRole("button", { name: "作成", exact: true }).click();
  await expect(page).toHaveURL("/politicians");
  const politicianCard = page
    .locator('[data-slot="card"]')
    .filter({ has: page.getByRole("heading", { name, exact: true }) });
  await politicianCard.getByRole("link", { name: "年度帳簿" }).click();
  await page.getByLabel(/^年度/).fill(String(year));
  await page.getByRole("button", { name: "帳簿を作成" }).click();
  await expect(page.getByRole("heading", { name: `${year}年度` })).toBeVisible();
  await page.getByRole("button", { name: "現在の対象を切り替え" }).click();
  await Promise.all([
    page.waitForNavigation({ waitUntil: "load" }),
    page.getByRole("button", { name: `${name}／${year}年度` }).click(),
  ]);

  // 支出の下書きを 2 件作り、それぞれ別の支払先をその場で作って紐づける
  await page.getByRole("link", { name: "仕訳の確認・編集" }).click();
  await expect(page.getByRole("heading", { name: "仕訳の確認・編集" })).toBeVisible();
  const dialog = page.getByRole("dialog");
  for (const description of ["視察先への移動", "会議室の利用料"]) {
    await clickUntil(page.getByRole("button", { name: "手動で仕訳を作成" }), (options) =>
      expect(dialog.getByLabel("日付", { exact: true })).toBeVisible(options),
    );
    await dialog.getByLabel("日付", { exact: true }).fill(`${year}-03-15`);
    await dialog.getByLabel("金額", { exact: true }).fill("1500");
    await dialog.getByLabel("項目名", { exact: true }).fill(description);
    await dialog.getByLabel("科目", { exact: true }).selectOption("transportation");
    await dialog.getByRole("button", { name: "下書きを作成" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("row").filter({ hasText: description })).toBeVisible();
  }
  const travelRow = page.getByRole("row").filter({ hasText: "視察先への移動" });
  const meetingRow = page.getByRole("row").filter({ hasText: "会議室の利用料" });
  for (const [row, payee] of [
    [travelRow, "東京タクシー"],
    [meetingRow, "貸会議室センター"],
  ] as const) {
    await row.getByRole("checkbox").click();
    await expect(page.getByText("1件選択")).toBeVisible();
    await clickBulkAction(page, "支払先をまとめて設定");
    await dialog.getByRole("button", { name: "新しい支払先を作成して紐づける" }).click();
    await dialog.getByLabel(/^名称/).fill(payee);
    await dialog.getByRole("button", { name: "作成して紐づける" }).click();
    await expect(page.getByText(`支払先「${payee}」を作成し、1件に紐づけました`)).toBeVisible();
    await expect(row).toContainText(payee);
  }

  // 東京タクシーに紐づく仕訳を確認済にして公開する
  await travelRow.click();
  await page.getByRole("button", { name: "確認済にする", exact: true }).click();
  await expect(travelRow).toContainText("確認済");
  await page.getByRole("link", { name: "公開", exact: true }).click();
  await expect(page.getByRole("heading", { name: "公開", exact: true })).toBeVisible();
  await page.getByRole("checkbox", { name: "視察先への移動を公開対象にする" }).click();
  await page.getByRole("button", { name: "1件（¥1,500）を公開する" }).click();
  await expect(page.getByText("確認済・未公開 0件")).toBeVisible();

  // 公開中の仕訳に紐づく支払先は削除できず、公開中の仕訳の件数が理由として出る
  await page.getByRole("link", { name: "支払先", exact: true }).click();
  await page.getByRole("link", { name: "東京タクシー", exact: true }).click();
  await expect(page.getByRole("heading", { name: "東京タクシー" })).toBeVisible();
  await clickUntil(page.getByRole("button", { name: "削除", exact: true }), (options) =>
    expect(dialog).toBeVisible(options),
  );
  await expect(dialog).toContainText("公開中の仕訳（1件）に紐づいているため削除できません");
  await expect(dialog.getByRole("button", { name: "削除する" })).toHaveCount(0);
  await dialog.getByRole("button", { name: "閉じる" }).click();
  await expect(dialog).toBeHidden();

  // 下書きだけに紐づく支払先は、未設定に戻る仕訳の件数を確認してから削除できる
  await page.getByRole("link", { name: "支払先の一覧に戻る" }).click();
  await page.getByRole("link", { name: "貸会議室センター", exact: true }).click();
  await expect(page.getByRole("heading", { name: "貸会議室センター" })).toBeVisible();
  const detailUrl = page.url();
  await clickUntil(page.getByRole("button", { name: "削除", exact: true }), (options) =>
    expect(dialog).toBeVisible(options),
  );
  await expect(dialog).toContainText("1件の仕訳（下書き・確認済）は、支払先が未設定になります");
  await dialog.getByRole("button", { name: "キャンセル" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("heading", { name: "貸会議室センター" })).toBeVisible();
  await clickUntil(page.getByRole("button", { name: "削除", exact: true }), (options) =>
    expect(dialog).toBeVisible(options),
  );
  await dialog.getByRole("button", { name: "削除する" }).click();
  await expect(
    page.getByText("支払先「貸会議室センター」を削除し、1件の仕訳の支払先を未設定にしました"),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/payees$/);
  await expect(page.getByRole("row").filter({ hasText: "東京タクシー" })).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "貸会議室センター" })).toHaveCount(0);

  // 紐づいていた下書きは支払先が未設定に戻り、公開中の仕訳の支払先はそのまま残る
  await page.getByRole("link", { name: "仕訳の確認・編集" }).click();
  await expect(meetingRow).toContainText("未設定");
  await expect(meetingRow).toContainText("下書き");
  await expect(travelRow).toContainText("東京タクシー");

  // 削除した支払先の詳細ページは 404 になる
  const missing = await page.goto(detailUrl);
  expect(missing?.status()).toBe(404);
});
