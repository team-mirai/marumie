import { test, expect } from "@playwright/test";
import { clickUntil } from "../helpers/interactions";

// 支払先（支出を受けた者）の管理と、仕訳の確認画面での紐づけの流れ。
// 支払先は議員ごとに持ち、確認画面では帳簿の議員の支払先だけを選べる。
const YEAR = new Date().getFullYear() - 1;

test("支払先の作成・編集と、確認画面での紐づけ・その場での作成・未設定の絞り込み", async ({ page }) => {
  const name = `e2e-payee-${Date.now()}`;
  await page.goto("/politicians/new");
  await page.getByLabel("氏名").fill(name);
  await page.getByLabel("スラッグ").fill(name);
  await page.getByLabel("当選日").fill(`${YEAR}-02-08`);
  await page.getByRole("button", { name: "作成", exact: true }).click();
  await expect(page).toHaveURL("/politicians");
  const politicianCard = page
    .locator('[data-slot="card"]')
    .filter({ has: page.getByRole("heading", { name, exact: true }) });
  await politicianCard.getByRole("link", { name: "年度帳簿" }).click();
  await page.getByLabel(/^年度/).fill(String(YEAR));
  await page.getByRole("button", { name: "帳簿を作成" }).click();
  await expect(page.getByRole("heading", { name: `${YEAR}年度` })).toBeVisible();
  await page.getByRole("button", { name: "現在の対象を切り替え" }).click();
  await Promise.all([
    page.waitForNavigation({ waitUntil: "load" }),
    page.getByRole("button", { name: `${name}／${YEAR}年度` }).click(),
  ]);

  // 支払先を作成する。郵便番号とインボイス登録番号の表記ゆれは保存時に揃える
  await page.getByRole("link", { name: "支払先", exact: true }).click();
  await expect(page.getByRole("heading", { name: "支払先" })).toBeVisible();
  const dialog = page.getByRole("dialog");
  await clickUntil(page.getByRole("button", { name: "支払先を追加" }), (options) =>
    expect(dialog.getByLabel(/^名称/)).toBeVisible(options),
  );
  await dialog.getByLabel(/^名称/).fill("東京タクシー");
  await dialog.getByLabel("郵便番号", { exact: true }).fill("１００ー０００１");
  await dialog.getByLabel("住所", { exact: true }).fill("東京都千代田区千代田1-1");
  await dialog.getByLabel("インボイス登録番号", { exact: true }).fill("t1234567890123");
  await dialog.getByRole("button", { name: "作成", exact: true }).click();
  await expect(dialog).toBeHidden();
  const taxi = page.getByRole("row").filter({ hasText: "東京タクシー" });
  await expect(taxi).toContainText("100-0001");
  await expect(taxi).toContainText("T1234567890123");

  // 編集する
  await clickUntil(taxi.getByRole("button", { name: "編集" }), (options) =>
    expect(dialog.getByLabel(/^名称/)).toBeVisible(options),
  );
  await dialog.getByLabel(/^名称/).fill("東京タクシー株式会社");
  await dialog.getByRole("button", { name: "保存", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("row").filter({ hasText: "東京タクシー株式会社" })).toBeVisible();

  // 確認画面で支出の下書きを 2 件作る
  await page.getByRole("link", { name: "仕訳の確認・編集" }).click();
  await expect(page.getByRole("heading", { name: "仕訳の確認・編集" })).toBeVisible();
  for (const description of ["タクシー代", "会議室の利用料"]) {
    await clickUntil(page.getByRole("button", { name: "手動で仕訳を作成" }), (options) =>
      expect(dialog.getByLabel("日付", { exact: true })).toBeVisible(options),
    );
    await dialog.getByLabel("日付", { exact: true }).fill(`${YEAR}-08-01`);
    await dialog.getByLabel("金額", { exact: true }).fill("3000");
    await dialog.getByLabel("項目名", { exact: true }).fill(description);
    await dialog.getByLabel("科目", { exact: true }).selectOption("printing");
    await dialog.getByRole("button", { name: "下書きを作成" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("row").filter({ hasText: description })).toBeVisible();
  }
  const taxiRow = page.getByRole("row").filter({ hasText: "タクシー代" });
  const meetingRow = page.getByRole("row").filter({ hasText: "会議室の利用料" });
  await expect(taxiRow).toContainText("支払先未設定");
  await expect(meetingRow).toContainText("支払先未設定");

  // 既存の支払先を選んで紐づける（手動で紐づけたと記録される）
  await clickUntil(taxiRow, (options) =>
    expect(page.getByLabel("項目名", { exact: true })).toHaveValue("タクシー代", options),
  );
  await clickUntil(page.getByRole("button", { name: "支払先を選ぶ" }), (options) =>
    expect(dialog.getByLabel("支払先", { exact: true })).toBeVisible(options),
  );
  await dialog
    .getByLabel("支払先", { exact: true })
    .selectOption({ label: "東京タクシー株式会社（東京都千代田区千代田1-1）" });
  await dialog.getByRole("button", { name: "紐づける", exact: true }).click();
  await expect(page.getByText("1件の支払先を「東京タクシー株式会社」にしました")).toBeVisible();
  await expect(taxiRow).toContainText("支払先：東京タクシー株式会社");
  await expect(page.getByText("手動で紐づけ")).toBeVisible();

  // 支払先が未設定の仕訳だけに絞り込める
  await page.getByLabel(/支払先が未設定だけ/).click();
  await expect(meetingRow).toBeVisible();
  await expect(taxiRow).toHaveCount(0);
  await page.getByLabel(/支払先が未設定だけ/).click();
  await expect(taxiRow).toBeVisible();

  // 選んだ仕訳に、その場で支払先を作成して紐づける
  await meetingRow.getByRole("checkbox").click();
  await expect(page.getByText("1件の下書きを選択中")).toBeVisible();
  await page.getByRole("button", { name: "支払先をまとめて設定" }).click();
  await dialog.getByRole("button", { name: "新しい支払先を作成して紐づける" }).click();
  await dialog.getByLabel(/^名称/).fill("貸会議室センター");
  await dialog.getByRole("button", { name: "作成して紐づける" }).click();
  await expect(page.getByText("支払先「貸会議室センター」を作成し、1件に紐づけました")).toBeVisible();
  await expect(meetingRow).toContainText("支払先：貸会議室センター");
  await expect(page.getByLabel(/支払先が未設定だけ/)).toBeVisible();
  await expect(page.getByText("支払先が未設定だけ（0）")).toBeVisible();

  // 作成した支払先は支払先の一覧にも並び、紐づいた仕訳の件数が分かる
  await page.getByRole("link", { name: "支払先", exact: true }).click();
  await expect(page.getByRole("row").filter({ hasText: "貸会議室センター" })).toContainText("1");
});
