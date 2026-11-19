import { test, expect, type Page } from "@playwright/test";
import path from "node:path";

const SAMPLE_CSV_PATH = path.resolve(process.cwd(), "../data/sample_donor_import.csv");

/**
 * 寄付者一括インポートページを開き、サンプル CSV をアップロードしてプレビューが
 * 表示される（「全件」タブが出る）まで待つ。
 */
async function uploadSampleCsv(page: Page) {
	await page.goto("/import-donors");

	await page.getByLabel("CSVファイル", { exact: true }).setInputFiles(SAMPLE_CSV_PATH);

	await expect(page.getByRole("button", { name: /全件/ })).toBeVisible({
		timeout: 10000,
	});
}

test.describe("寄付者一括インポート", () => {
	test.describe("読み込み", () => {
		test("寄付者一括インポートページが正常に表示される", async ({ page }) => {
			await page.goto("/import-donors");

			await expect(
				page.getByRole("heading", { name: "寄付者一括インポート" }),
			).toBeVisible();
			await expect(page.getByLabel("CSVファイル", { exact: true })).toBeVisible();

			// ページ内の政治団体セレクタは廃止し、サイドバー上部で選んだ対象に追従する
			await expect(page.getByRole("main")).toContainText("サンプル党／2025年度");
			await expect(page.getByRole("main").getByRole("combobox")).toHaveCount(0);
		});
	});

	test.describe("CSVプレビュー", () => {
		test("CSVファイルをアップロードするとタブ付きのプレビューテーブルが表示される", async ({
			page,
		}) => {
			await uploadSampleCsv(page);

			await expect(
				page.getByRole("button", { name: /新規寄付者/ }),
			).toBeVisible();
			await expect(
				page.getByRole("button", { name: /既存寄付者/ }),
			).toBeVisible();
			await expect(page.getByRole("button", { name: /エラー/ })).toBeVisible();
			await expect(page.getByRole("button", { name: /取引なし/ })).toBeVisible();
			await expect(
				page.getByRole("button", { name: /種別不整合/ }),
			).toBeVisible();

			const table = page.locator("table");
			await expect(table).toBeVisible();
			await expect(
				table.getByRole("columnheader", { name: "行番号" }),
			).toBeVisible();
			await expect(
				table.getByRole("columnheader", { name: "ステータス" }),
			).toBeVisible();
			await expect(
				table.getByRole("columnheader", { name: "取引No" }),
			).toBeVisible();
			await expect(
				table.getByRole("columnheader", { name: "寄付者名" }),
			).toBeVisible();
			await expect(
				table.getByRole("columnheader", { name: "寄付者種別" }),
			).toBeVisible();
			await expect(table.locator("tbody tr")).not.toHaveCount(0);
		});

		test("タブをクリックするとフィルタリングされる", async ({ page }) => {
			await uploadSampleCsv(page);

			const allTabButton = page.getByRole("button", { name: /全件/ });
			const allTabText = await allTabButton.textContent();
			const allCount = allTabText?.match(/\((\d+)\)/)?.[1];

			const newDonorButton = page.getByRole("button", { name: /新規寄付者/ });
			await newDonorButton.click();

			const displayInfo = page.getByText(/件中.*件を表示/);
			await expect(displayInfo).toBeVisible();

			await allTabButton.click();
			const displayInfoAfterAll = page.getByText(
				new RegExp(`${allCount} 件中`),
			);
			await expect(displayInfoAfterAll).toBeVisible();
		});

		test("ツールチップが表示される", async ({ page }) => {
			await uploadSampleCsv(page);

			const newDonorButton = page.getByRole("button", { name: /新規寄付者/ });
			await newDonorButton.hover();

			await expect(page.getByText("寄付者マスタに未登録の寄付者です")).toBeVisible({
				timeout: 3000,
			});
		});

		test.describe("CSVインポート確定", () => {
			// この describe 配下のテストは同じ寄付者 CSV を実際に DB へ書き込む。
			// fullyParallel のまま並列に走ると同じ寄付者を同時に createMany して
			// 一意制約違反で失敗するため、describe 単位で fullyParallel を解除し
			// 同一ワーカーで順番に実行する（serial と違い、1 件失敗しても以降は skip されない）。
			test.describe.configure({ mode: "default" });

			test("有効な行がある場合、インポートボタンが表示される", async ({
				page,
			}) => {
				await uploadSampleCsv(page);

				const importButton = page.getByRole("button", { name: /件をインポート/ });
				await expect(importButton).toBeVisible();
				await expect(importButton).toBeEnabled();
			});

			test("インポートボタンをクリックするとインポートが実行される", async ({
				page,
			}) => {
				await uploadSampleCsv(page);

				const importButton = page.getByRole("button", { name: /件をインポート/ });
				await expect(importButton).toBeVisible();

				await importButton.click();

				await expect(page.getByRole("button", { name: /インポート中/ })).toBeVisible({
					timeout: 5000,
				});

				await expect(page.getByText(/件のインポートが完了しました/)).toBeVisible({
					timeout: 30000,
				});

				await expect(page.getByRole("button", { name: /件をインポート/ })).not.toBeVisible({
					timeout: 5000,
				});
			});

			test("インポート成功後、ファイル入力がリセットされる", async ({
				page,
			}) => {
				await uploadSampleCsv(page);

				const importButton = page.getByRole("button", { name: /件をインポート/ });
				await importButton.click();

				await expect(page.getByText(/件のインポートが完了しました/)).toBeVisible({
					timeout: 30000,
				});

				const table = page.locator("table");
				await expect(table).not.toBeVisible({ timeout: 5000 });
			});
		});
	});
});
