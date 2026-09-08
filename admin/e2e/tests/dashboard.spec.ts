import { test, expect } from "@playwright/test";

test.describe("ダッシュボード", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
	});

	test.describe("読み込み", () => {
		test("ログイン後にダッシュボードが正常に表示される", async ({ page }) => {
			await expect(page.getByRole("heading", { name: "ダッシュボード" })).toBeVisible();
		});

		test("Welcomeメッセージが表示される", async ({ page }) => {
			await expect(page.getByText("Use the left navigation to manage data.")).toBeVisible();
		});
	});
});
