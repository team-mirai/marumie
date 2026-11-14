import { test, expect } from "@playwright/test";

test.describe("まる見え政治資金とはページ", () => {
	test.beforeEach(async ({ page }) => {
		const response = await page.goto("/about");
		expect(response?.status()).toBe(200);
	});

	test("パンくず・見出し・作成中の案内が表示される", async ({ page }) => {
		await expect(page).toHaveTitle(/まる見え政治資金とは/);

		const breadcrumbs = page.getByRole("navigation", { name: "パンくずリスト" });
		await expect(breadcrumbs.getByRole("link", { name: "トップ" })).toHaveAttribute("href", "/");
		await expect(breadcrumbs.getByText("まる見え政治資金とは")).toBeVisible();

		await expect(
			page.getByRole("heading", { level: 1, name: "まる見え政治資金とは" }),
		).toBeVisible();
		await expect(page.getByRole("note")).toHaveText("このページは作成中です");
	});

	test("ページ下部に「データについて」のブロックが表示される", async ({ page }) => {
		const notes = page.getByRole("region", { name: "データについて" });
		for (const title of ["まる見え政治資金について", "データの出典", "調査研究費について", "免責事項"]) {
			await expect(notes.getByRole("heading", { name: title, exact: true })).toBeVisible();
		}
	});

	test("ヘッダーとフッターが表示される", async ({ page }) => {
		await expect(page.locator("header")).toBeVisible();
		await expect(page.locator("footer")).toBeVisible();
	});
});
