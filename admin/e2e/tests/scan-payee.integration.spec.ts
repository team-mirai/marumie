import { readFileSync } from "fs";
import { join } from "path";
import { test, expect } from "@playwright/test";
import { clickUntil } from "../helpers/interactions";

// 書類スキャンで支払先が新しく登録され、2 枚目はそれに紐づくことを、実際の LLM API と
// 実際の領収書の画像（黒塗り済み。#1721）で確かめる。LLM も読み取り結果もモックしない。
// 明示的に有効にしたときだけ動く（admin/.env.local に有効な ANTHROPIC_API_KEY が要る）:
//   pnpm supabase:start && pnpm db:reset
//   pnpm test:integration:e2e
test.skip(process.env.INTEGRATION_TEST !== "true", "INTEGRATION_TEST=true のときだけ動かす");

const RECEIPTS = ["amazon-receipt-01.png", "amazon-receipt-02.png"].map((name) => ({
  name,
  mimeType: "image/png",
  buffer: readFileSync(join(__dirname, "../../tests/data/research-fund", name)),
}));

test("2 枚の Amazon の領収書を読み取ると、Amazon の支払先が 1 件だけ登録され、仕訳件数が 2 になり、詳細ページで書類上の表記を確認・削除できる", async ({
  page,
}) => {
  test.setTimeout(300_000);
  const name = `e2e-scan-payee-${Date.now()}`;
  await page.goto("/politicians/new");
  await page.getByLabel("氏名").fill(name);
  await page.getByLabel("スラッグ").fill(name);
  await page.getByLabel("当選日").fill("2026-02-08");
  await page.getByRole("button", { name: "作成", exact: true }).click();
  await expect(page).toHaveURL("/politicians");
  const politicianCard = page
    .locator('[data-slot="card"]')
    .filter({ has: page.getByRole("heading", { name, exact: true }) });
  await politicianCard.getByRole("link", { name: "年度帳簿" }).click();
  await page.getByLabel(/^年度/).fill("2026");
  await page.getByRole("button", { name: "帳簿を作成" }).click();
  await expect(page.getByRole("heading", { name: "2026年度" })).toBeVisible();
  await page.getByRole("button", { name: "現在の対象を切り替え" }).click();
  await Promise.all([
    page.waitForNavigation({ waitUntil: "load" }),
    page.getByRole("button", { name: `${name}／2026年度` }).click(),
  ]);

  // 既定の読み取りプロンプトを保存する（アップロードには有効なプロンプト版が要る）
  await page.getByRole("link", { name: "読み取りプロンプト" }).click();
  const receiptPrompt = page.getByRole("region", { name: "領収書の読み取り" });
  await clickUntil(receiptPrompt.getByRole("button", { name: "保存して v1 にする" }), (options) =>
    expect(receiptPrompt.getByText("v1 有効")).toBeVisible(options),
  );

  // 2 枚をアップロードすると、画面がそのまま読み取りを進める
  await page.getByRole("link", { name: "書類スキャン" }).click();
  await expect(page.getByRole("button", { name: "ファイルを選ぶ" })).toBeEnabled();
  await page.getByLabel("領収書・請求書").setInputFiles(RECEIPTS);
  const batch = page.locator('[data-slot="card"]').filter({ hasText: "のバッチ" });
  await expect(batch).toContainText("2件中 2件完了・0件失敗", { timeout: 240_000 });

  // 支払先は出品者（AnkerDirect / QiuWavyMart）ではなく Amazon に揃い、1 件だけ登録される
  await page.getByRole("link", { name: "支払先", exact: true }).click();
  await expect(page.getByRole("heading", { name: "支払先" })).toBeVisible();
  const rows = page.getByRole("row").filter({ has: page.getByRole("link") });
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText(/Amazon|アマゾン/i);
  // 仕訳（この帳簿）の件数
  await expect(rows.first().getByRole("cell").nth(4)).toHaveText("2");

  // 詳細ページに、書類から読み取った発行元の名称が支払先の表記として並び、削除できる
  await rows.first().getByRole("link").click();
  const aliases = page.getByRole("button", { name: /^表記「.+」を削除$/ });
  await expect(aliases.first()).toBeVisible();
  const before = await aliases.count();
  await aliases.first().click();
  await page.getByRole("button", { name: "削除する" }).click();
  await expect(page.getByText(/^表記「.+」を削除しました$/)).toBeVisible();
  await expect(aliases).toHaveCount(before - 1);
});
