import { test, expect } from "@playwright/test";
import { clickUntil } from "../helpers/interactions";

// 立替の入力から精算までの流れ。立替は事務所内の管理情報なので、下書きのうちから入力でき、
// 精算は金額が確定した確認済・公開中だけに許す。
// 帳簿は前年度で作る（仕訳の日付が必ず過去になり、精算日に「今日」を指定できる）。
const YEAR = new Date().getFullYear() - 1;

test("立替者の入力→一括設定→確認済→一括精算、未精算の絞り込みと集計", async ({ page }) => {
  const name = `e2e-advance-${Date.now()}`;
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
  await page.getByRole("link", { name: "仕訳の確認・編集" }).click();
  await expect(page.getByRole("heading", { name: "仕訳の確認・編集" })).toBeVisible();

  // 支出の下書きを 2 件作る
  for (const [description, amount] of [
    ["会議室の利用料", "3000"],
    ["資料の印刷代", "2000"],
  ]) {
    const dialog = page.getByRole("dialog");
    await clickUntil(page.getByRole("button", { name: "手動で仕訳を作成" }), (options) =>
      expect(dialog.getByLabel("日付", { exact: true })).toBeVisible(options),
    );
    await dialog.getByLabel("日付", { exact: true }).fill(`${YEAR}-08-01`);
    await dialog.getByLabel("金額", { exact: true }).fill(amount);
    await dialog.getByLabel("項目名", { exact: true }).fill(description);
    await dialog.getByLabel("科目", { exact: true }).selectOption("printing");
    await dialog.getByRole("button", { name: "下書きを作成" }).click();
    await expect(dialog).toBeHidden();
    // 一覧の再取得が終わるまで待つ（終わる前のクリックは pending として捨てられる）
    await expect(page.getByRole("row").filter({ hasText: description })).toBeVisible();
  }
  const meeting = page.getByRole("row").filter({ hasText: "会議室の利用料" });
  const printing = page.getByRole("row").filter({ hasText: "資料の印刷代" });

  // 1 件ずつ立替者を入力する（編集フォームとは別に保存する）
  await clickUntil(meeting, (options) =>
    expect(page.getByLabel("項目名", { exact: true })).toHaveValue("会議室の利用料", options),
  );
  await page.getByLabel("立替者", { exact: true }).fill(" 秘書A ");
  await page.getByRole("button", { name: "立替者を保存" }).click();
  await expect(page.getByText("1件の立替者を「秘書A」にしました")).toBeVisible();
  // 前後の空白は落として保存するので、表記ゆれで集計が分かれない
  await expect(meeting).toContainText("立替：秘書A");
  await expect(page.getByText("秘書A：¥3,000")).toBeVisible();
  // 下書きは精算できないので、1 件の欄でもボタンを押せずその理由が出る
  await expect(page.getByRole("button", { name: "精算済にする" })).toBeDisabled();
  await expect(page.getByText(/「会議室の利用料」は下書きです/)).toBeVisible();

  // 複数選んで立替者をまとめて設定する
  await page.getByRole("checkbox", { name: "表示中の支出の仕訳をすべて選択" }).click();
  await expect(page.getByText("2件の下書きを選択中")).toBeVisible();
  // 下書きは金額が確定していないので精算できない
  await expect(page.getByRole("button", { name: "まとめて精算" })).toHaveCount(0);
  await page.getByRole("button", { name: "立替者をまとめて設定" }).click();
  const assignDialog = page.getByRole("dialog");
  await assignDialog.getByLabel("立替者", { exact: true }).fill("秘書B");
  await assignDialog.getByRole("button", { name: "設定する" }).click();
  await expect(page.getByText("2件の立替者を「秘書B」にしました")).toBeVisible();
  await expect(meeting).toContainText("立替：秘書B");
  await expect(printing).toContainText("立替：秘書B");
  await expect(page.getByText("秘書B：¥5,000")).toBeVisible();

  // 確認済にしてからまとめて精算する
  await page.getByRole("checkbox", { name: "表示中の支出の仕訳をすべて選択" }).click();
  await page.getByRole("button", { name: "まとめて確認済にする" }).click();
  await expect(page.getByRole("tab", { name: /^確認済（2）$/ })).toBeVisible();
  await page.getByRole("checkbox", { name: "表示中の支出の仕訳をすべて選択" }).click();
  await expect(page.getByText("2件の確認済を選択中")).toBeVisible();
  await page.getByRole("button", { name: "まとめて精算" }).click();
  const settleDialog = page.getByRole("dialog");
  // 確認ダイアログに件数と立替者ごとの合計額が出る
  await expect(settleDialog).toContainText("選択中の2件の立替");
  await expect(settleDialog).toContainText("秘書B：¥5,000");
  await expect(settleDialog).toContainText("（2件）");
  const settledAt = `${YEAR}-09-30`;
  await settleDialog.getByLabel("精算日").fill(settledAt);
  await settleDialog.getByRole("button", { name: "精算済にする" }).click();
  await expect(page.getByText(`2件の立替を精算済（${settledAt}）にしました`)).toBeVisible();
  await expect(meeting).toContainText("精算済");
  await expect(printing).toContainText("精算済");
  // 精算済は未精算の集計から外れる
  await expect(page.getByText("秘書B：¥5,000")).toHaveCount(0);

  // 「未精算の立替だけ」で絞り込むと精算済は出ない
  await page.getByLabel("未精算の立替だけ").click();
  await expect(page.getByRole("tab", { name: /^すべて（0）$/ })).toBeVisible();
  await page.getByLabel("未精算の立替だけ").click();
  await expect(page.getByRole("tab", { name: /^すべて（2）$/ })).toBeVisible();
  // 立替者で絞り込める（既存の月・状態の絞り込みと組み合わせられる）
  await page.getByLabel("立替者で絞り込み").selectOption("秘書B");
  await expect(page.getByRole("tab", { name: /^すべて（2）$/ })).toBeVisible();
  await page.getByLabel("月", { exact: true }).selectOption("09");
  await expect(page.getByRole("tab", { name: /^すべて（0）$/ })).toBeVisible();
  await page.getByLabel("月", { exact: true }).selectOption("");
  await page.getByLabel("立替者で絞り込み").selectOption("");

  // 精算済は金額・立替者を変更できず、破棄もできない
  await clickUntil(meeting, (options) =>
    expect(page.getByLabel("項目名", { exact: true })).toHaveValue("会議室の利用料", options),
  );
  await expect(page.getByLabel("金額", { exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "破棄", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "立替者を保存" })).toHaveCount(0);
  await expect(page.getByText(`秘書B／精算済（${settledAt}）`)).toBeVisible();
  // 未精算に戻すと変更できるようになる
  await page.getByRole("button", { name: "未精算に戻す" }).click();
  await expect(page.getByText("1件を未精算に戻しました")).toBeVisible();
  await clickUntil(meeting, (options) =>
    expect(page.getByRole("button", { name: "立替者を保存" })).toBeVisible(options),
  );
  await expect(page.getByLabel("金額", { exact: true })).toBeEnabled();

  // 1 件の欄から精算できる（立替者の変更が未保存のうちは精算させない）
  await page.getByLabel("立替者", { exact: true }).fill("秘書C");
  await expect(page.getByRole("button", { name: "精算済にする" })).toBeDisabled();
  await expect(page.getByText("立替者の変更を保存してから精算してください")).toBeVisible();
  await page.getByLabel("立替者", { exact: true }).fill("秘書B");
  await page.getByRole("button", { name: "精算済にする" }).click();
  const singleSettledAt = `${YEAR}-10-31`;
  // 精算日の初期値は日本時間の今日。日付を指定して確定する
  await expect(page.getByLabel("精算日")).not.toHaveValue("");
  await page.getByLabel("精算日").fill(singleSettledAt);
  await page.getByRole("button", { name: "精算する" }).click();
  await expect(page.getByText(`1件の立替を精算済（${singleSettledAt}）にしました`)).toBeVisible();
  await expect(meeting).toContainText("精算済");
  // 欄は「立替者／精算済（日付）」と「未精算に戻す」の表示に切り替わる
  await clickUntil(meeting, (options) =>
    expect(page.getByText(`秘書B／精算済（${singleSettledAt}）`)).toBeVisible(options),
  );
  await page.getByRole("button", { name: "未精算に戻す" }).click();
  await expect(page.getByText("1件を未精算に戻しました")).toBeVisible();
  await clickUntil(meeting, (options) =>
    expect(page.getByRole("button", { name: "立替者を保存" })).toBeVisible(options),
  );

  await page.getByLabel("立替者", { exact: true }).fill("");
  await page.getByRole("button", { name: "立替者を保存" }).click();
  await expect(page.getByText("1件の立替者を解除しました")).toBeVisible();
  await expect(meeting).not.toContainText("立替：");
  // 残った精算済は、まとめて未精算に戻せる
  await page.getByRole("checkbox", { name: "資料の印刷代を選択" }).click();
  await page.getByRole("button", { name: "まとめて未精算に戻す" }).click();
  await expect(printing).not.toContainText("精算済");
  await expect(page.getByText("秘書B：¥2,000")).toBeVisible();

  await page.goto("/politicians");
  await politicianCard.getByRole("button", { name: "削除", exact: true }).click();
  await page.getByRole("button", { name: "削除する", exact: true }).click();
  await expect(politicianCard).toHaveCount(0);
});
