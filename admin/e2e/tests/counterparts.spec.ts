import { test, expect } from "@playwright/test";

test.describe("取引先マスタ管理", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/login");
		await page.getByLabel("Email").fill("foo@example.com");
		await page.getByLabel("Password").fill("foo@example.com");
		await page.getByRole("button", { name: "ログイン" }).click();
		await expect(page).toHaveURL("/");
	});

	test.describe("読み込み", () => {
		test("取引先マスタページが正常に表示される", async ({ page }) => {
			await page.goto("/counterparts");

			await expect(page.getByRole("heading", { name: "取引先マスタ管理" })).toBeVisible();
			await expect(page.getByRole("button", { name: "新規作成" })).toBeVisible();
		});

		test("シードデータの取引先が一覧に表示される", async ({ page }) => {
			await page.goto("/counterparts");

			await expect(page.getByRole("link", { name: "寄附　太郎" })).toBeVisible();
			await expect(page.getByRole("link", { name: "東京電力株式会社" })).toBeVisible();
		});

		test("検索フォームが表示される", async ({ page }) => {
			await page.goto("/counterparts");

			await expect(
				page.getByLabel("取引先を名前または住所で検索")
			).toBeVisible();
			await expect(page.getByRole("button", { name: "検索" })).toBeVisible();
		});

		test("テーブルヘッダーが正しく表示される", async ({ page }) => {
			await page.goto("/counterparts");

			await expect(page.getByRole("columnheader", { name: "名前" })).toBeVisible();
			await expect(page.getByRole("columnheader", { name: "住所" })).toBeVisible();
			await expect(page.getByRole("columnheader", { name: "使用数" })).toBeVisible();
			await expect(page.getByRole("columnheader", { name: "操作" })).toBeVisible();
		});

		test("取引先の件数が表示される", async ({ page }) => {
			await page.goto("/counterparts");

			await expect(page.getByText(/\d+件の取引先/)).toBeVisible();
		});
	});

	test.describe("書き込み", () => {
		test("新規取引先を作成できる", async ({ page }) => {
			await page.goto("/counterparts");

			await page.getByRole("button", { name: "新規作成" }).click();

			await expect(page.getByRole("heading", { name: "新規取引先作成" })).toBeVisible();

			const uniqueName = `テスト取引先 ${Date.now()}`;
			const postalCode = "123-4567";
			const address = "東京都テスト区テスト町1-2-3";

			// ダイアログ内のフォームフィールドを特定するため、getByRole('textbox')を使用
			await page.getByRole("textbox", { name: /^名前/ }).fill(uniqueName);
			await page.getByRole("textbox", { name: "郵便番号" }).fill(postalCode);
			await page.getByRole("textbox", { name: "住所" }).fill(address);

			await page.getByRole("button", { name: "作成" }).click();

			await expect(page.getByRole("link", { name: uniqueName })).toBeVisible();
		});

		test("検索機能が正常に動作する", async ({ page }) => {
			await page.goto("/counterparts");

			await expect(page.getByRole("link", { name: "東京電力株式会社" })).toBeVisible();
			await expect(page.getByRole("link", { name: "寄附　太郎" })).toBeVisible();

			await page.getByLabel("取引先を名前または住所で検索").fill("東京電力");
			await page.getByRole("button", { name: "検索" }).click();

			// URLエンコードされた日本語を確認
			await expect(page).toHaveURL(/q=/);
			await expect(page.getByRole("link", { name: "東京電力株式会社" })).toBeVisible();
			await expect(page.getByRole("link", { name: "寄附　太郎" })).not.toBeVisible();
		});

		test("検索をクリアできる", async ({ page }) => {
			await page.goto("/counterparts?q=東京電力");

			await expect(page.getByRole("button", { name: "クリア" })).toBeVisible();
			await page.getByRole("button", { name: "クリア" }).click();

			await expect(page).toHaveURL("/counterparts");
			await expect(page.getByRole("link", { name: "寄附　太郎" })).toBeVisible();
		});

		test("名前が空の場合は作成ボタンが無効になる", async ({ page }) => {
			await page.goto("/counterparts");

			await page.getByRole("button", { name: "新規作成" }).click();

			await expect(page.getByRole("heading", { name: "新規取引先作成" })).toBeVisible();

			const createButton = page.getByRole("button", { name: "作成" });
			await expect(createButton).toBeDisabled();

			// ダイアログ内のフォームフィールドを特定するため、getByRole('textbox')を使用
			await page.getByRole("textbox", { name: /^名前/ }).fill("テスト");
			await expect(createButton).toBeEnabled();
		});
	});
});
