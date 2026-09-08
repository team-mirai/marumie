import { test, expect } from "@playwright/test";

test.describe("サイドバー", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
	});

	test("ログインユーザーのメールアドレスとログアウトボタンが表示される", async ({ page }) => {
		const sidebar = page.getByRole("complementary");

		await expect(sidebar.getByText("foo@example.com")).toBeVisible();
		await expect(sidebar.getByRole("button", { name: "ログアウト" })).toBeVisible();
	});

	test("折りたたみボタンでアイコンレールと展開表示を切り替えられる", async ({ page }) => {
		const sidebar = page.getByRole("complementary");
		const transactionsLink = sidebar.getByRole("link", { name: "取引一覧" });

		// 展開状態: ラベルが見えている
		await expect(sidebar.getByText("ADMIN CONSOLE")).toBeVisible();
		await expect(transactionsLink).toBeVisible();

		// 折りたたむ: ラベル・セクション見出しは消えるが、リンク自体（アイコン + sr-only ラベル）は残る
		await sidebar.getByRole("button", { name: "サイドバーを折りたたむ" }).click();
		await expect(sidebar).toHaveAttribute("data-collapsed", "true");
		await expect(sidebar.getByText("ADMIN CONSOLE")).toBeHidden();
		await expect(sidebar.getByText("データ取り込み")).toBeHidden();
		await expect(transactionsLink).toBeVisible();
		await expect(transactionsLink).toHaveAttribute("href", "/transactions");

		// 再度展開する
		await sidebar.getByRole("button", { name: "サイドバーを開く" }).click();
		await expect(sidebar).toHaveAttribute("data-collapsed", "false");
		await expect(sidebar.getByText("ADMIN CONSOLE")).toBeVisible();
	});
});
