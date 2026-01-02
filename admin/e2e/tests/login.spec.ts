import { test, expect } from "@playwright/test";

test.describe("ログインページ", () => {
	test("ログインページが正常に表示される", async ({ page }) => {
		const response = await page.goto("/login");

		expect(response?.status()).toBe(200);
		await expect(page).toHaveTitle(/政治資金ダッシュボード/);
	});

	test("正しい認証情報でログインに成功する", async ({ page }) => {
		await page.goto("/login");

		await page.getByLabel("Email").fill("foo@example.com");
		await page.getByLabel("Password").fill("foo@example.com");
		await page.getByRole("button", { name: "ログイン" }).click();

		// ダッシュボードにリダイレクトされることを確認
		await expect(page).toHaveURL("/");
		await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
	});

	test("間違ったパスワードでログインに失敗する", async ({ page }) => {
		await page.goto("/login");

		await page.getByLabel("Email").fill("foo@example.com");
		await page.getByLabel("Password").fill("wrongpassword");
		await page.getByRole("button", { name: "ログイン" }).click();

		// ログインページに留まることを確認
		await expect(page).toHaveURL(/\/login/);
	});
});
