import { test, expect } from "@playwright/test";

test.describe("ダッシュボード", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/login");
		await page.getByLabel("Email").fill("foo@example.com");
		await page.getByLabel("Password").fill("foo@example.com");
		await page.getByRole("button", { name: "ログイン" }).click();
		await expect(page).toHaveURL("/");
	});

	test.describe("読み込み", () => {
		test("ログイン後にダッシュボードが正常に表示される", async ({ page }) => {
			await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
		});

		test("Welcomeメッセージが表示される", async ({ page }) => {
			await expect(page.getByText("Use the left navigation to manage data.")).toBeVisible();
		});
	});
});
