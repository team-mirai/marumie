import { test, expect } from "@playwright/test";

test("ログインページが正常に表示される", async ({ page }) => {
	const response = await page.goto("/login");

	expect(response?.status()).toBe(200);
	await expect(page).toHaveTitle(/政治資金ダッシュボード/);
});
