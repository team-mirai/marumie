import { test, expect } from "@playwright/test";

test.describe("ユーザー情報", () => {
	test.describe("読み込み", () => {
		test("ユーザー情報ページが正常に表示される", async ({ page }) => {
			await page.goto("/user-info");

			await expect(page.getByRole("heading", { name: "ユーザー情報" })).toBeVisible();
		});

		test("ログイン中のユーザーのメールアドレスが表示される", async ({ page }) => {
			await page.goto("/user-info");

			// サイドバーのフッターにもメールアドレスが表示されるため、本文領域にスコープする
			await expect(page.getByRole("main").getByText("foo@example.com")).toBeVisible();
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
