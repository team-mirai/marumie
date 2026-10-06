import { test, expect } from "@playwright/test";

// ログイン自体を検証するため、共通の認証済み storageState は使わない
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("ログインページ", () => {
	test("ログインページが正常に表示される", async ({ page }) => {
		const response = await page.goto("/login");

		expect(response?.status()).toBe(200);
		// ローカル・本番は接頭辞なし。ステージングだけ "[stg] " が前置される
		await expect(page).toHaveTitle("まる見え政治資金 - 管理画面");
	});

	test("正しい認証情報でログインに成功する", async ({ page }) => {
		await page.goto("/login");

		await page.getByLabel("Email").fill("foo@example.com");
		await page.getByLabel("Password").fill("foo@example.com");
		await page.getByRole("button", { name: "ログイン" }).click();

		// ダッシュボードにリダイレクトされることを確認
		await expect(page).toHaveURL("/");
		await expect(page.getByRole("heading", { name: "ダッシュボード" })).toBeVisible();
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
