import { test, expect } from "@playwright/test";

test.describe("政治団体ページ", () => {
	test.describe("読み込み", () => {
		test("ルートにアクセスすると政治団体ページにリダイレクトされる", async ({
			page,
		}) => {
			const errors: string[] = [];

			// ページ内で発生する未キャッチ例外を収集
			page.on("pageerror", (error) => {
				errors.push(
					`${error.name}: ${error.message}${error.stack ? `\n${error.stack}` : ""}`,
				);
			});

			await page.goto("/");

			// /o/{slug} にリダイレクトされることを確認
			await expect(page).toHaveURL(/\/o\/[\w-]+$/);
			await expect(page).toHaveTitle(/みらいまる見え政治資金/);

			// 収支の流れセクションが描画されるまで待機（networkidle依存を避ける）
			await expect(
				page.locator("#cash-flow").getByText("収支の流れ"),
			).toBeVisible();
			// サンキーチャート（SVG）が描画されるまで待機
			await expect(
				page.locator("#cash-flow").locator('[role="img"][aria-label="政治資金の収支フロー図"]'),
			).toBeVisible();

			// 実行時エラーが発生していないことを確認
			expect(
				errors,
				`以下のエラーが発生しました:\n${errors.join("\n")}`,
			).toHaveLength(0);
		});

		test("政治団体ページが正常に表示される", async ({ page }) => {
			const response = await page.goto("/o/sample-party");

			expect(response?.status()).toBe(200);
			await expect(page).toHaveTitle(/サンプル党.*みらいまる見え政治資金/);
		});

		test("存在しないslugの場合はデフォルトの政治団体にリダイレクトされる", async ({
			page,
		}) => {
			await page.goto("/o/non-existent-org");

			// デフォルトの政治団体にリダイレクトされる
			await expect(page).toHaveURL(/\/o\/[\w-]+$/);
			await expect(page).not.toHaveURL(/non-existent-org/);
		});

		test("収支の流れセクションが表示される", async ({ page }) => {
			await page.goto("/o/sample-party");

			// 収支の流れセクションが存在することを確認（メインコンテンツ内のセクション）
			await expect(page.locator("#cash-flow").getByText("収支の流れ")).toBeVisible();
		});
	});

	test.describe("政治団体セレクター", () => {
		test("セレクターをクリックするとドロップダウンが開く", async ({ page }) => {
			await page.goto("/o/sample-party");

			// セレクターボタンをクリック
			const selectorButton = page.getByRole("button", { name: /サンプル党/ });
			await selectorButton.click();

			// ドロップダウンが開いて選択肢が表示される
			await expect(page.getByText("表示する政治団体")).toBeVisible();
		});

		test("別の政治団体を選択するとページが切り替わる", async ({ page }) => {
			await page.goto("/o/sample-party");

			// セレクターを開く
			const selectorButton = page.getByRole("button", { name: /サンプル党/ });
			await selectorButton.click();

			// ドロップダウン内の選択肢をクリック（E2Eテスト団体が存在する場合）
			// 最初のシードデータ以外のオプションを選択
			const options = page.locator(
				'[class*="absolute"] button:has-text("E2Eテスト団体")',
			);
			const optionCount = await options.count();

			if (optionCount > 0) {
				await options.first().click();
				await expect(page).toHaveURL("/o/e2e-test-org");
			} else {
				// E2Eテスト団体がない場合はスキップ
				test.skip();
			}
		});
	});

	test.describe("詳細画面への遷移", () => {
		test("取引一覧ページに遷移できる", async ({ page }) => {
			await page.goto("/o/sample-party");

			// 「すべての取引を見る」リンクをクリック
			const viewAllLink = page.getByRole("link", {
				name: /すべての.*見る|もっと見る/,
			});
			await viewAllLink.first().click();

			// 取引一覧ページに遷移することを確認
			await expect(page).toHaveURL("/o/sample-party/transactions");
			await expect(
				page.getByRole("heading", { name: /すべての出入金/ }),
			).toBeVisible();
		});

		test("取引一覧ページが正常に表示される", async ({ page }) => {
			const response = await page.goto("/o/sample-party/transactions");

			expect(response?.status()).toBe(200);
			await expect(page).toHaveTitle(/全ての出入金.*みらいまる見え政治資金/);
		});

		test("取引一覧ページでもセレクターで団体を切り替えられる", async ({
			page,
		}) => {
			await page.goto("/o/sample-party/transactions");

			// セレクターを開く
			const selectorButton = page.getByRole("button", { name: /サンプル党/ });
			await selectorButton.click();

			// ドロップダウン内の選択肢をクリック
			const options = page.locator(
				'[class*="absolute"] button:has-text("E2Eテスト団体")',
			);
			const optionCount = await options.count();

			if (optionCount > 0) {
				await options.first().click();
				// URLが変更されることを確認（transactionsパスは維持）
				await expect(page).toHaveURL("/o/e2e-test-org/transactions");
			} else {
				// E2Eテスト団体がない場合はスキップ
				test.skip();
			}
		});
	});
});
