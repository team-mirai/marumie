import { test, expect } from "@playwright/test";

test.describe("プライバシーポリシーページ", () => {
	test("プライバシーポリシーページが正常に表示される", async ({ page }) => {
		const response = await page.goto("/privacy");

		expect(response?.status()).toBe(200);
		await expect(page).toHaveTitle(/みらい まる見え政治資金/);
	});
});
