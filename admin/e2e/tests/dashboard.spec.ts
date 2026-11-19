import { test, expect } from "@playwright/test";

test.describe("ダッシュボード", () => {
	test("ログイン後にダッシュボードが表示される", async ({ page }) => {
		await page.goto("/");

		await expect(page.getByRole("heading", { name: "ダッシュボード" })).toBeVisible();
	});
});
