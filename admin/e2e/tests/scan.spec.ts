import { test, expect } from "@playwright/test";
import { clickUntil } from "../helpers/interactions";

// 1x1 の JPEG。E2E ではバイナリの中身は問われないので、リポジトリに置かず生成する
const JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==",
  "base64",
);
const PDF = Buffer.from("%PDF-1.4\n%%EOF\n", "utf8");

async function attach(page: import("@playwright/test").Page, files: { name: string; mimeType: string; buffer: Buffer }[]) {
  await page.getByLabel("領収書・請求書").setInputFiles(files);
}

test("プロンプト保存後に書類をアップロードすると、バッチと待機中のジョブが並ぶ", async ({ page }) => {
  const name = `e2e-scan-${Date.now()}`;
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

  // 有効なプロンプト版が無いうちはアップロードできない（ジョブが版を必須で記録するため）
  await page.getByRole("link", { name: "書類スキャン" }).click();
  await expect(page.getByRole("heading", { name: "書類スキャン" })).toBeVisible();
  await expect(page.getByText(`${name} ／ 2026年度 の帳簿に追加されます`)).toBeVisible();
  await expect(page.getByRole("button", { name: "ファイルを選ぶ" })).toBeDisabled();
  await expect(page.getByText("読み取りプロンプトがまだ保存されていません")).toBeVisible();
  await expect(page.getByText("まだバッチがありません。")).toBeVisible();

  await page.getByRole("link", { name: "読み取りプロンプト" }).click();
  await clickUntil(page.getByRole("button", { name: "保存して v1 にする" }), (options) =>
    expect(page.getByText("v1 有効")).toBeVisible(options),
  );

  await page.getByRole("link", { name: "書類スキャン" }).click();
  await expect(page.getByRole("button", { name: "ファイルを選ぶ" })).toBeEnabled();

  await attach(page, [
    { name: "IMG_4102.jpg", mimeType: "image/jpeg", buffer: JPEG },
    { name: "invoice_openai_08.pdf", mimeType: "application/pdf", buffer: PDF },
  ]);

  // アップロードした書類が 1書類=1ジョブで、すべて待機中として並ぶ
  const batch = page.locator('[data-slot="card"]').filter({ hasText: "のバッチ" });
  await expect(batch).toBeVisible();
  await expect(batch).toContainText("2件中 0件完了・0件失敗");
  const jobs = batch.getByRole("row").filter({ hasText: /IMG_4102\.jpg|invoice_openai_08\.pdf/ });
  await expect(jobs).toHaveCount(2);
  await expect(jobs.filter({ hasText: "IMG_4102.jpg" })).toContainText("待機中");
  await expect(jobs.filter({ hasText: "invoice_openai_08.pdf" })).toContainText("待機中");
  await expect(batch.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  await expect(page.getByText("プロンプト v1")).toBeVisible();

  // 保存済みのバッチは再読み込み後も残る
  await page.reload();
  await expect(batch.getByRole("row").filter({ hasText: "IMG_4102.jpg" })).toBeVisible();

  // 対応外の形式・31枚以上はアップロード前に弾く
  await attach(page, [
    { name: "memo.txt", mimeType: "text/plain", buffer: Buffer.from("memo", "utf8") },
  ]);
  await expect(page.getByText("JPG・PNG・PDFのみアップロードできます（memo.txt）")).toBeVisible();
  await attach(
    page,
    Array.from({ length: 31 }, (_, index) => ({
      name: `IMG_${index}.jpg`,
      mimeType: "image/jpeg",
      buffer: JPEG,
    })),
  );
  await expect(
    page.getByText("1回にアップロードできるのは30枚までです（31枚が選ばれています）"),
  ).toBeVisible();
  // 弾かれた分はバッチを増やさない
  await expect(page.locator('[data-slot="card"]').filter({ hasText: "のバッチ" })).toHaveCount(1);
});
