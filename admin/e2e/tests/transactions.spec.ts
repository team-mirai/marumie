import { test, expect } from "@playwright/test";

test.describe("取引一覧", () => {
	test.describe("読み込み", () => {
		test("取引一覧ページにシードデータの取引が表示される", async ({ page }) => {
			await page.goto("/transactions");

			await expect(page.getByRole("heading", { name: "取引一覧" })).toBeVisible();

			const selector = page.getByRole("combobox");
			await expect(selector).toBeVisible();
			await selector.click();
			await expect(page.getByRole("option", { name: "サンプル党" })).toBeVisible();
			await page.keyboard.press("Escape");

			const table = page.locator("table");
			await expect(table).toBeVisible();
			await expect(table.getByRole("columnheader", { name: "取引日" })).toBeVisible();
			await expect(table.getByRole("columnheader", { name: "借方勘定科目" })).toBeVisible();
			await expect(table.locator("tbody tr")).not.toHaveCount(0);
		});

		test("次のページに遷移できる", async ({ page }) => {
			// シードの sample-party の取引は 1 ページ（50 件）を超えるため、
			// 「次へ」が必ず表示される前提で決定的に検証する
			await page.goto("/transactions");

			await expect(page.getByText(/^全 \d+ 件中 1 - 50 件を表示$/)).toBeVisible();

			const pagination = page.getByRole("navigation", { name: "pagination" });
			await pagination.getByRole("link", { name: "次へ" }).click();

			await expect(page).toHaveURL(/page=2/);
			await expect(page.getByText(/^全 \d+ 件中 51 - \d+ 件を表示$/)).toBeVisible();
		});
	});
});
