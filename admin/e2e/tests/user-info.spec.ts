import { test, expect } from "@playwright/test";

test.describe("ユーザー情報", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/login");
		await page.getByLabel("Email").fill("foo@example.com");
		await page.getByLabel("Password").fill("foo@example.com");
		await page.getByRole("button", { name: "ログイン" }).click();
		await expect(page).toHaveURL("/");
	});

	test.describe("読み込み", () => {
		test("ユーザー情報ページが正常に表示される", async ({ page }) => {
			await page.goto("/user-info");

			await expect(page.getByRole("heading", { name: "ユーザー情報" })).toBeVisible();
		});

		test("ログイン中のユーザーのメールアドレスが表示される", async ({ page }) => {
			await page.goto("/user-info");

			await expect(page.getByText("foo@example.com")).toBeVisible();
		});

		test("ロール情報が表示される", async ({ page }) => {
			await page.goto("/user-info");

			await expect(page.getByText("ロール:")).toBeVisible();
		});

		test("作成日が表示される", async ({ page }) => {
			await page.goto("/user-info");

			await expect(page.getByText("作成日:")).toBeVisible();
		});
	});
});
