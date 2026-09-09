import { test, expect } from "@playwright/test";

test.describe("ユーザー情報", () => {
	test("ログイン中のユーザー情報が表示される", async ({ page }) => {
		await page.goto("/user-info");

		await expect(page.getByRole("heading", { name: "ユーザー情報" })).toBeVisible();
		// サイドバーのフッターにもメールアドレスが表示されるため、本文領域にスコープする
		await expect(page.getByRole("main").getByText("foo@example.com")).toBeVisible();
	});
});
