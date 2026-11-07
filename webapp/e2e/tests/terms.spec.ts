import { test, expect } from "@playwright/test";

test.describe("利用規約ページ", () => {
	test("利用規約ページが正常に表示される", async ({ page }) => {
		const response = await page.goto("/terms");

		expect(response?.status()).toBe(200);
		await expect(page.getByRole("heading", { name: "利用規約" })).toBeVisible();
		await expect(page.getByText("第1条（公開するデータの範囲）")).toBeVisible();
	});
});
