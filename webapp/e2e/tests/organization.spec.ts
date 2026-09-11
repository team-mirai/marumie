import { test, expect } from "@playwright/test";

test.describe("政治団体ページ", () => {
	test.describe("読み込み", () => {
		// ルートのリダイレクト先はDB上の政治団体一覧の先頭（表示名の降順）で決まるため、
		// admin の E2E が作った団体が遷移先になることがある。
		// ここではリダイレクトが起きることだけを検証し、ページの中身の検証は
		// シードで作られた sample-party を明示的に指定するテストで行う。
		test("ルートにアクセスすると政治団体ページにリダイレクトされる", async ({
			page,
		}) => {
			await page.goto("/");

			// /o/{slug}/{year} にリダイレクトされることを確認
			await expect(page).toHaveURL(/\/o\/[\w-]+\/\d{4}$/);
			await expect(page).toHaveTitle(/みらいまる見え政治資金/);
		});

		test("政治団体ページが正常に表示される", async ({ page }) => {
			const errors: string[] = [];

			// ページ内で発生する未キャッチ例外を収集
			page.on("pageerror", (error) => {
				errors.push(
					`${error.name}: ${error.message}${error.stack ? `\n${error.stack}` : ""}`,
				);
			});

			const response = await page.goto("/o/sample-party/2026");

			expect(response?.status()).toBe(200);
			await expect(page).toHaveTitle(/サンプル党.*みらいまる見え政治資金/);

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

		test("年度なしのURLはデフォルト年度にリダイレクトされる", async ({
			page,
		}) => {
			await page.goto("/o/sample-party");

			// デフォルト年度（2026）にリダイレクトされる
			await expect(page).toHaveURL(/\/o\/sample-party\/2026$/);
		});

		test("存在しないslugの場合はデフォルトの政治団体にリダイレクトされる", async ({
			page,
		}) => {
			await page.goto("/o/non-existent-org/2026");

			// デフォルトの政治団体にリダイレクトされる
			await expect(page).toHaveURL(/\/o\/[\w-]+\/2026$/);
			await expect(page).not.toHaveURL(/non-existent-org/);
		});
	});

	test.describe("政治団体・年度セレクター", () => {
		test("セレクターをクリックするとシートが開く", async ({ page }) => {
			await page.goto("/o/sample-party/2026");

			// セレクターボタンをクリック
			const selectorButton = page.getByRole("button", { name: /サンプル党/ });
			await selectorButton.click();

			// ドロップダウンが開いて選択肢が表示される
			await expect(page.getByText("表示する団体名")).toBeVisible();
		});

		test("別の政治団体を選択するとページが切り替わる", async ({ page }) => {
			await page.goto("/o/sample-party/2026");

			// セレクターを開く
			const selectorButton = page.getByRole("button", { name: /サンプル党/ });
			await selectorButton.click();

			// シード済みの「E2Eテスト団体」（slug: e2e-test-org）を選択する
			await page.getByRole("button", { name: "E2Eテスト団体" }).click();
			await expect(page).toHaveURL("/o/e2e-test-org/2026");
		});

		test("年度を切り替えるとページが切り替わる", async ({ page }) => {
			await page.goto("/o/sample-party/2026");

			// セレクターを開く
			const selectorButton = page.getByRole("button", { name: /サンプル党/ });
			await selectorButton.click();

			// 2025年ボタンをクリック
			await page.getByRole("button", { name: "2025年" }).click();

			// URLが2025に変わることを確認
			await expect(page).toHaveURL("/o/sample-party/2025");
		});
	});

	test.describe("詳細画面への遷移", () => {
		test("取引一覧ページに遷移できる", async ({ page }) => {
			await page.goto("/o/sample-party/2026");

			// 「すべての取引を見る」リンクをクリック
			const viewAllLink = page.getByRole("link", {
				name: /すべての.*見る|もっと見る/,
			});
			await viewAllLink.first().click();

			// 取引一覧ページに遷移することを確認
			await expect(page).toHaveURL("/o/sample-party/2026/transactions");
			await expect(
				page.getByRole("heading", { name: /すべての出入金/ }),
			).toBeVisible();
		});

		test("取引一覧ページが正常に表示される", async ({ page }) => {
			const response = await page.goto("/o/sample-party/2026/transactions");

			expect(response?.status()).toBe(200);
			await expect(page).toHaveTitle(/全ての出入金.*みらいまる見え政治資金/);
		});

		test("取引一覧ページでもセレクターで団体を切り替えられる", async ({
			page,
		}) => {
			await page.goto("/o/sample-party/2026/transactions");

			// セレクターを開く
			const selectorButton = page.getByRole("button", { name: /サンプル党/ });
			await selectorButton.click();

			// シード済みの「E2Eテスト団体」を選択すると、transactions パスを維持したまま URL が変わる
			await page.getByRole("button", { name: "E2Eテスト団体" }).click();
			await expect(page).toHaveURL("/o/e2e-test-org/2026/transactions");
		});
	});
});
