import { test, expect } from "@playwright/test";

test("活用方針を保存し、仕訳を束ねた支出群を作って編集し、同じ仕訳の二重紐づけを拒む", async ({ page }) => {
  const name = `e2e-group-${Date.now()}`;
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

  // 紐づける費用仕訳を 2 件作る
  await page.getByRole("link", { name: "仕訳の確認・編集" }).click();
  for (const [description, date, amount] of [
    ["視察先への移動", "2026-03-01", "1200"],
    ["資料の印刷", "2026-05-14", "3000"],
  ]) {
    const dialog = page.getByRole("dialog");
    // ハイドレーション前にクリックするとダイアログが開かないことがあるので開くまで試す
    await expect(async () => {
      await page.getByRole("button", { name: "手動で仕訳を作成" }).click();
      await expect(dialog).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 20000 });
    await dialog.getByLabel("日付", { exact: true }).fill(date);
    await dialog.getByLabel("金額", { exact: true }).fill(amount);
    await dialog.getByLabel("項目名", { exact: true }).fill(description);
    await dialog.getByLabel("科目", { exact: true }).selectOption("taxi");
    await dialog.getByRole("button", { name: "下書きを作成" }).click();
    await expect(dialog).toBeHidden();
  }

  await page.getByRole("link", { name: "支出群と成果" }).click();
  await expect(page.getByRole("heading", { name: "支出群と成果" })).toBeVisible();
  await expect(page.getByText("まだ支出群がありません")).toBeVisible();

  // 帳簿全体の活用方針は保存され、再読み込みしても残る
  const policy = page.getByLabel("活用方針（帳簿全体・議員本人が書く1〜2行）");
  await policy.fill("調査ツールとIT環境の整備に重点を置いて使います。");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.getByText("活用方針を保存しました")).toBeVisible();
  await page.reload();
  await expect(policy).toHaveValue("調査ツールとIT環境の整備に重点を置いて使います。");

  await page.getByRole("link", { name: "支出群を作る" }).click();
  await expect(page.getByRole("heading", { name: "支出群を作る" })).toBeVisible();
  await page.getByLabel("タイトル").fill("議会質問づくりの相棒");
  await page.getByLabel("使った目的と、そこから生まれたもの").fill("質問主意書2本の下調べに使った。");
  await page.getByLabel("成果物1のラベル").fill("議事録");
  await page.getByLabel("成果物1のURL").fill("https://example.com/minutes");
  await page.getByRole("button", { name: "成果物を追加" }).click();
  await page.getByLabel("成果物2のラベル").fill("レポート");

  // 金額・件数・期間は紐づけからライブ集計される
  const summary = page.getByRole("status", { name: "紐づけの集計" });
  const linkList = page.getByRole("listitem").filter({ hasText: "視察先への移動" });
  await linkList.getByRole("checkbox").check();
  await page.getByRole("listitem").filter({ hasText: "資料の印刷" }).getByRole("checkbox").check();
  await expect(summary).toContainText("¥4,200");
  await expect(summary).toContainText("2件");
  await expect(summary).toContainText("2026.03.01 〜 05.14");

  await page.getByRole("button", { name: "作成する" }).click();
  await expect(page).toHaveURL(/expenditure-groups$/);
  const card = page.locator('[data-slot="card"]').filter({ has: page.getByRole("heading", { name: "議会質問づくりの相棒" }) });
  await expect(card).toContainText("¥4,200");
  await expect(card).toContainText("2件");
  await expect(card).toContainText("2026.03.01 〜 05.14");
  await expect(card.getByRole("link", { name: "議事録" })).toHaveAttribute("href", "https://example.com/minutes");
  await expect(card).toContainText("レポート（報告は準備中）");

  // 別の支出群からは、すでに紐づいた仕訳を選べない
  await page.getByRole("link", { name: "支出群を作る" }).click();
  await expect(
    page.getByRole("listitem").filter({ hasText: "視察先への移動" }).getByRole("checkbox"),
  ).toBeDisabled();
  await page.getByRole("link", { name: "支出群の一覧に戻る" }).click();

  // 編集は同じフォームで、自分の紐づけは外せる
  await card.getByRole("link", { name: "編集" }).click();
  await expect(page.getByRole("heading", { name: "支出群を編集" })).toBeVisible();
  await expect(page.getByLabel("タイトル")).toHaveValue("議会質問づくりの相棒");
  await expect(page.getByLabel("成果物2のURL")).toHaveValue("");
  await page.getByRole("listitem").filter({ hasText: "資料の印刷" }).getByRole("checkbox").uncheck();
  await page.getByLabel("タイトル").fill("議会質問づくりの相棒（改）");
  await page.getByRole("button", { name: "保存する" }).click();
  await expect(page).toHaveURL(/expenditure-groups$/);
  const edited = page.locator('[data-slot="card"]').filter({ has: page.getByRole("heading", { name: "議会質問づくりの相棒（改）" }) });
  await expect(edited).toContainText("¥1,200");
  await expect(edited).toContainText("1件");
  await expect(edited).toContainText("2026.03.01");

  // 外した仕訳は別の支出群で選べるようになる
  await page.getByRole("link", { name: "支出群を作る" }).click();
  await expect(
    page.getByRole("listitem").filter({ hasText: "資料の印刷" }).getByRole("checkbox"),
  ).toBeEnabled();

  await page.goto("/politicians");
  await politicianCard.getByRole("button", { name: "削除", exact: true }).click();
  await page.getByRole("button", { name: "削除する", exact: true }).click();
  await expect(politicianCard).toHaveCount(0);
});
