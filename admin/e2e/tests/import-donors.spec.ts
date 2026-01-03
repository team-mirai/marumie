import { test, expect } from "@playwright/test";
import path from "node:path";

test.describe("寄付者一括インポート", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/login");
		await page.getByLabel("Email").fill("foo@example.com");
		await page.getByLabel("Password").fill("foo@example.com");
		await page.getByRole("button", { name: "ログイン" }).click();
		await expect(page).toHaveURL("/");
	});

	test.describe("読み込み", () => {
		test("寄付者一括インポートページが正常に表示される", async ({ page }) => {
			await page.goto("/import-donors");

			await expect(
				page.getByRole("heading", { name: "寄付者一括インポート" }),
			).toBeVisible();
			await expect(page.getByRole("combobox")).toBeVisible();
			await expect(page.getByLabel("CSV File:")).toBeVisible();
		});

		test("政治団体セレクターが表示される", async ({ page }) => {
			await page.goto("/import-donors");

			const selector = page.getByRole("combobox");
			await expect(selector).toBeVisible();

			await selector.click();
			await expect(
				page.getByRole("option", { name: "サンプル党" }),
			).toBeVisible();
		});
	});

	test.describe("CSVプレビュー", () => {
		test("CSVファイルをアップロードするとプレビューが表示される", async ({
			page,
		}) => {
			await page.goto("/import-donors");

			const fileInput = page.getByLabel("CSV File:");
			const csvPath = path.resolve(
				process.cwd(),
				"../data/sample_donor_import.csv",
			);
			await fileInput.setInputFiles(csvPath);

			await expect(page.getByText("ファイルを処理中...")).toBeVisible();

			await expect(page.getByRole("button", { name: /全件/ })).toBeVisible({
				timeout: 10000,
			});
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
		});

		test("プレビューテーブルにデータが表示される", async ({ page }) => {
			await page.goto("/import-donors");

			const fileInput = page.getByLabel("CSV File:");
			const csvPath = path.resolve(
				process.cwd(),
				"../data/sample_donor_import.csv",
			);
			await fileInput.setInputFiles(csvPath);

			await expect(page.getByRole("button", { name: /全件/ })).toBeVisible({
				timeout: 10000,
			});

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

			const rows = table.locator("tbody tr");
			await expect(rows).not.toHaveCount(0);
		});

		test("タブをクリックするとフィルタリングされる", async ({ page }) => {
			await page.goto("/import-donors");

			const fileInput = page.getByLabel("CSV File:");
			const csvPath = path.resolve(
				process.cwd(),
				"../data/sample_donor_import.csv",
			);
			await fileInput.setInputFiles(csvPath);

			await expect(page.getByRole("button", { name: /全件/ })).toBeVisible({
				timeout: 10000,
			});

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
			await page.goto("/import-donors");

			const fileInput = page.getByLabel("CSV File:");
			const csvPath = path.resolve(
				process.cwd(),
				"../data/sample_donor_import.csv",
			);
			await fileInput.setInputFiles(csvPath);

			await expect(page.getByRole("button", { name: /全件/ })).toBeVisible({
				timeout: 10000,
			});

			const newDonorButton = page.getByRole("button", { name: /新規寄付者/ });
			await newDonorButton.hover();

			await expect(page.getByText("寄付者マスタに未登録の寄付者です")).toBeVisible({
				timeout: 3000,
			});
		});

		test.describe("CSVインポート確定", () => {
			test("有効な行がある場合、インポートボタンが表示される", async ({
				page,
			}) => {
				await page.goto("/import-donors");

				const fileInput = page.getByLabel("CSV File:");
				const csvPath = path.resolve(
					process.cwd(),
					"../data/sample_donor_import.csv",
				);
				await fileInput.setInputFiles(csvPath);

				await expect(page.getByRole("button", { name: /全件/ })).toBeVisible({
					timeout: 10000,
				});

				const importButton = page.getByRole("button", { name: /件をインポート/ });
				await expect(importButton).toBeVisible();
				await expect(importButton).toBeEnabled();
			});

			test("インポートボタンをクリックするとインポートが実行される", async ({
				page,
			}) => {
				await page.goto("/import-donors");

				const fileInput = page.getByLabel("CSV File:");
				const csvPath = path.resolve(
					process.cwd(),
					"../data/sample_donor_import.csv",
				);
				await fileInput.setInputFiles(csvPath);

				await expect(page.getByRole("button", { name: /全件/ })).toBeVisible({
					timeout: 10000,
				});

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
				await page.goto("/import-donors");

				const fileInput = page.getByLabel("CSV File:");
				const csvPath = path.resolve(
					process.cwd(),
					"../data/sample_donor_import.csv",
				);
				await fileInput.setInputFiles(csvPath);

				await expect(page.getByRole("button", { name: /全件/ })).toBeVisible({
					timeout: 10000,
				});

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
