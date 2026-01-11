import { test, expect } from "@playwright/test";

test.describe("取引一覧ページ", () => {
	test("取引一覧ページが正常に表示され、実行時エラーが発生しないこと", async ({
		page,
	}) => {
		const errors: string[] = [];

		// ページ内で発生する未キャッチ例外を収集
		page.on("pageerror", (error) => {
			errors.push(
				`${error.name}: ${error.message}${error.stack ? `\n${error.stack}` : ""}`,
			);
		});

		const response = await page.goto("/o/sample-party/transactions");

		expect(response, "page.goto() が失敗しました").not.toBeNull();
		expect(response!.status()).toBe(200);
		await expect(page).toHaveTitle(/全ての出入金.*みらいまる見え政治資金/);

		// 取引一覧の見出しが描画されるまで待機（networkidle依存を避ける）
		await expect(
			page.getByRole("heading", { name: /すべての出入金|全ての出入金/ }),
		).toBeVisible();
		// 取引一覧テーブルが描画されるまで待機
		await expect(
			page.locator('table[aria-label="政治資金取引一覧表"]'),
		).toBeVisible();

		// 実行時エラーが発生していないことを確認
		expect(
			errors,
			`以下のエラーが発生しました:\n${errors.join("\n")}`,
		).toHaveLength(0);
	});
});
