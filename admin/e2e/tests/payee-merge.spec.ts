import { test, expect } from "@playwright/test";
import { clickUntil } from "../helpers/interactions";

// 支払先の統合。詳細ページで見ている支払先に、同じ議員の別の支払先をまとめる。
// 統合元の仕訳は統合先に紐づき、統合元の名称は統合先の表記になり、統合元は一覧から消える。
// インボイス登録番号が食い違う支払先は統合できない。
test("移る仕訳と表記を確認してから支払先を統合でき、インボイス登録番号が食い違う支払先は統合できない", async ({ page }) => {
  const year = new Date().getFullYear();
  const name = `e2e-payee-merge-${Date.now()}`;
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

  // 同じ相手の支払先が 2 件（東京タクシー株式会社・東京ﾀｸｼｰ）と、番号の違う別の相手を作る
  await page.getByRole("link", { name: "支払先", exact: true }).click();
  await expect(page.getByRole("heading", { name: "支払先" })).toBeVisible();
  for (const [payee, invoice] of [
    ["東京タクシー株式会社", "T1234567890123"],
    ["東京ﾀｸｼｰ", ""],
    ["東京交通", "T9999999999999"],
  ] as const) {
    await page.getByRole("link", { name: "支払先を追加" }).click();
    await page.getByLabel(/^名称/).fill(payee);
    await page.getByLabel("インボイス登録番号", { exact: true }).fill(invoice);
    await page.getByRole("button", { name: "作成", exact: true }).click();
    await expect(page.getByRole("heading", { name: payee, exact: true })).toBeVisible();
    await page.getByRole("link", { name: "支払先の一覧に戻る" }).click();
    await expect(page.getByRole("row").filter({ hasText: payee })).toBeVisible();
  }

  const dialog = page.getByRole("dialog");
  // 支出の下書きを東京ﾀｸｼｰに紐づける
  await page.getByRole("link", { name: "仕訳の確認・編集" }).click();
  await expect(page.getByRole("heading", { name: "仕訳の確認・編集" })).toBeVisible();
  await clickUntil(page.getByRole("button", { name: "手動で仕訳を作成" }), (options) =>
    expect(dialog.getByLabel("日付", { exact: true })).toBeVisible(options),
  );
  await dialog.getByLabel("日付", { exact: true }).fill(`${year}-03-15`);
  await dialog.getByLabel("金額", { exact: true }).fill("1500");
  await dialog.getByLabel("項目名", { exact: true }).fill("視察先への移動");
  await dialog.getByLabel("科目", { exact: true }).selectOption("transportation");
  await dialog.getByRole("button", { name: "下書きを作成" }).click();
  await expect(dialog).toBeHidden();
  const travelRow = page.getByRole("row").filter({ hasText: "視察先への移動" });
  await clickUntil(travelRow, (options) =>
    expect(page.getByLabel("項目名", { exact: true })).toHaveValue("視察先への移動", options),
  );
  await clickUntil(page.getByRole("button", { name: "支払先を選ぶ" }), (options) =>
    expect(dialog.getByRole("combobox", { name: "支払先を検索" })).toBeVisible(options),
  );
  await dialog.getByRole("option", { name: /東京ﾀｸｼｰ/ }).click();
  await dialog.getByRole("button", { name: "紐づける", exact: true }).click();
  await expect(travelRow).toContainText("東京ﾀｸｼｰ");

  // 統合先の詳細ページを開く
  await page.getByRole("link", { name: "支払先", exact: true }).click();
  await page.getByRole("link", { name: "東京タクシー株式会社", exact: true }).click();
  await expect(page.getByRole("heading", { name: "東京タクシー株式会社" })).toBeVisible();
  const openMerge = () =>
    clickUntil(page.getByRole("button", { name: "統合", exact: true }), (options) =>
      expect(dialog).toBeVisible(options),
    );
  const source = dialog.getByLabel("統合する支払先", { exact: true });

  // インボイス登録番号が食い違う支払先は、理由が出て統合できない
  await openMerge();
  await source.selectOption({ label: "東京交通" });
  await expect(dialog.getByRole("alert")).toContainText("インボイス登録番号が食い違うため統合できません");
  await expect(dialog.getByRole("button", { name: "統合する" })).toBeDisabled();

  // 移る仕訳の件数と表記を確認でき、キャンセルすれば何も変わらない
  await source.selectOption({ label: "東京ﾀｸｼｰ" });
  await expect(dialog).toContainText("1件の仕訳が、この支払先に紐づきます");
  await expect(dialog.getByRole("listitem")).toHaveText(["東京ﾀｸｼｰ"]);
  await dialog.getByRole("button", { name: "キャンセル" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("この帳簿には、この支払先に紐づいている仕訳はありません。")).toBeVisible();

  // 統合すると、仕訳と表記が統合先に移る
  await openMerge();
  await source.selectOption({ label: "東京ﾀｸｼｰ" });
  await dialog.getByRole("button", { name: "統合する" }).click();
  await expect(
    page.getByText("支払先「東京ﾀｸｼｰ」を統合し、1件の仕訳を「東京タクシー株式会社」に紐づけました"),
  ).toBeVisible();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("row").filter({ hasText: "視察先への移動" })).toContainText("下書き");
  await expect(page.getByRole("row").filter({ hasText: "東京ﾀｸｼｰ" })).toContainText("手動");

  // 統合元は一覧から消え、確認画面の仕訳は統合先に紐づいている
  await page.getByRole("link", { name: "支払先の一覧に戻る" }).click();
  await expect(page.getByRole("row").filter({ hasText: "東京タクシー株式会社" })).toBeVisible();
  await expect(page.getByRole("link", { name: "東京ﾀｸｼｰ", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "仕訳の確認・編集" }).click();
  await expect(travelRow).toContainText("東京タクシー株式会社");
  await expect(travelRow).toContainText("下書き");
});
