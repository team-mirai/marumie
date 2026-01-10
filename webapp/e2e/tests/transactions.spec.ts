import { test, expect } from "@playwright/test";

test.describe("取引一覧ページ", () => {
	test("取引一覧ページが正常に表示され、実行時エラーが発生しないこと", async ({
		page,
	}) => {
		const errors: string[] = [];

		// ページ内で発生するエラーを収集（warningは除外）
		page.on("pageerror", (error) => {
			errors.push(`${error.name}: ${error.message}`);
		});

		// コンソールのerrorレベルのメッセージも収集（warningは除外）
		page.on("console", (msg) => {
			if (msg.type() === "error") {
				errors.push(`Console error: ${msg.text()}`);
			}
		});

		const response = await page.goto("/o/sample-party/transactions");

		expect(response?.status()).toBe(200);
		await expect(page).toHaveTitle(/全ての出入金.*みらいまる見え政治資金/);

		// ページの描画が完了するまで待機
		await page.waitForLoadState("networkidle");
		await page.waitForTimeout(2000);

		// 実行時エラーが発生していないことを確認
		expect(
			errors,
			`以下のエラーが発生しました:\n${errors.join("\n")}`,
		).toHaveLength(0);
	});
});
