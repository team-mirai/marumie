import { test, expect } from "@playwright/test";

test.describe("取引一覧", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/login");
		await page.getByLabel("Email").fill("foo@example.com");
		await page.getByLabel("Password").fill("foo@example.com");
		await page.getByRole("button", { name: "ログイン" }).click();
		await expect(page).toHaveURL("/");
	});

	test.describe("読み込み", () => {
		test("取引一覧ページが正常に表示される", async ({ page }) => {
			await page.goto("/transactions");

			await expect(page.getByRole("heading", { name: "取引一覧" })).toBeVisible();
			await expect(page.getByRole("combobox")).toBeVisible();
		});

		test("政治団体セレクターが表示される", async ({ page }) => {
			await page.goto("/transactions");

			const selector = page.getByRole("combobox");
			await expect(selector).toBeVisible();

			await selector.click();
			await expect(page.getByRole("option", { name: "サンプル党" })).toBeVisible();
		});

		test("シードデータの取引が一覧に表示される", async ({ page }) => {
			await page.goto("/transactions");

			await expect(page.getByRole("heading", { name: "取引一覧" })).toBeVisible();

			await page.waitForSelector("table");

			const table = page.locator("table");
			await expect(table).toBeVisible();

			await expect(table.getByRole("columnheader", { name: "取引日" })).toBeVisible();
			await expect(table.getByRole("columnheader", { name: "政治団体" })).toBeVisible();
			await expect(table.getByRole("columnheader", { name: "借方勘定科目" })).toBeVisible();
			await expect(table.getByRole("columnheader", { name: "借方金額" })).toBeVisible();
			await expect(table.getByRole("columnheader", { name: "貸方勘定科目" })).toBeVisible();
			await expect(table.getByRole("columnheader", { name: "貸方金額" })).toBeVisible();
			await expect(table.getByRole("columnheader", { name: "種別" })).toBeVisible();
			await expect(table.getByRole("columnheader", { name: "カテゴリ" })).toBeVisible();

			const rows = table.locator("tbody tr");
			await expect(rows).not.toHaveCount(0);
		});

		test("ページネーションが機能する", async ({ page }) => {
			await page.goto("/transactions");

			await page.waitForSelector("table");

			const paginationInfo = page.getByText(/全 \d+ 件中/);
			await expect(paginationInfo).toBeVisible();

			const pagination = page.locator("nav[aria-label='pagination']");
			if (await pagination.isVisible()) {
				const nextButton = pagination.getByRole("link", { name: /次/ });
				if (await nextButton.isVisible()) {
					await nextButton.click();
					await expect(page).toHaveURL(/page=2/);
				}
			}
		});
	});
});
