import { test, expect } from "@playwright/test";
import { clickUntil } from "../helpers/interactions";

// 支出に「徴難」を付けて「領収書等を徴し難かった事情」を書く流れと、書類が無く徴難でもない仕訳の絞り込み（#1778）。
const YEAR = new Date().getFullYear() - 1;

test("支出に徴難を付けて徴し難かった事情を書き、徴難を外すと事情も消え、書類も徴難もない仕訳を絞り込める", async ({
  page,
}) => {
  const name = `e2e-receipt-absence-${Date.now()}`;
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

  // 手動で作った仕訳は書類を持たない
  await page.getByRole("link", { name: "仕訳の確認・編集" }).click();
  await expect(page.getByRole("heading", { name: "仕訳の確認・編集" })).toBeVisible();
  const dialog = page.getByRole("dialog");
  for (const description of ["電車代", "会議室の利用料"]) {
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
  const trainRow = page.getByRole("row").filter({ hasText: "電車代" });
  const meetingRow = page.getByRole("row").filter({ hasText: "会議室の利用料" });
  const missingFilter = page.getByRole("button", { name: /^書類なし・徴難なし/ });
  await expect(trainRow).toContainText("書類なし・徴難なし");
  await expect(missingFilter).toHaveText("書類なし・徴難なし 2");

  // 徴難を付ける（「事務所内の管理」のチェックだけで保存する）。付けるまで事情の行は出ない
  await clickUntil(trainRow, (options) =>
    expect(page.getByLabel("項目名", { exact: true })).toHaveValue("電車代", options),
  );
  await expect(page.getByRole("button", { name: "書類の事情を編集" })).toHaveCount(0);
  const absent = page.getByLabel("領収書等を徴し難かった", { exact: true });
  await absent.click();
  await expect(page.getByText("徴難にしました")).toBeVisible();
  await expect(absent).toBeChecked();
  await expect(trainRow).toContainText("徴難・事情未入力");
  await expect(missingFilter).toHaveText("書類なし・徴難なし 1");

  // 事情を書く（鉛筆で行を編集モードにし、行ごとに保存する）
  const officeGroup = page.getByRole("region", { name: "事務所内の管理" });
  await expect(officeGroup).toContainText("未入力");
  await page.getByRole("button", { name: "書類の事情を編集" }).click();
  await page.getByLabel("書類の事情", { exact: true }).fill("自動券売機で購入したため");
  await page.getByRole("button", { name: "事情を保存" }).click();
  await expect(page.getByText("徴し難かった事情を保存しました")).toBeVisible();
  await expect(trainRow).not.toContainText("事情未入力");
  await expect(officeGroup).toContainText("自動券売機で購入したため");

  // 書類が無く徴難でもない仕訳だけに絞り込める
  await missingFilter.click();
  await expect(meetingRow).toBeVisible();
  await expect(trainRow).toHaveCount(0);
  await missingFilter.click();
  await expect(trainRow).toBeVisible();

  // 徴難を外すと（確認のうえ）事情も消える
  await clickUntil(trainRow, (options) =>
    expect(page.getByLabel("項目名", { exact: true })).toHaveValue("電車代", options),
  );
  page.once("dialog", (dialog) => dialog.accept());
  await absent.click();
  await expect(page.getByText("徴難を外しました")).toBeVisible();
  await expect(absent).not.toBeChecked();
  await expect(officeGroup).not.toContainText("自動券売機で購入したため");
  await expect(trainRow).toContainText("書類なし・徴難なし");
  await expect(missingFilter).toHaveText("書類なし・徴難なし 2");
});
