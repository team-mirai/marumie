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

	test.describe("各セクションの表示", () => {
		// シードの sample-party の取引はすべて 2025 年度にあるため、表示がシードの値だけで決まる 2025 年度を見る。
		// 現在の年度を見ると「現時点での貸借対照表」など年をまたいで変わる表示に依存してしまう
		test.beforeEach(async ({ page }) => {
			await page.goto("/o/sample-party/2025");
		});

		test("収支の流れに収入・支出の総額と収支が表示される", async ({ page }) => {
			const cashFlow = page.locator("#cash-flow");

			await expect(cashFlow).toContainText(/収入総額\s*1581万円/);
			await expect(cashFlow).toContainText(/支出総額\s*1281万円/);
			await expect(cashFlow).toContainText(/収支\s*300万円/);
		});

		test("月ごとの収支の推移のグラフが描画される", async ({ page }) => {
			const monthlyTrends = page.locator("#monthly-trends");

			await expect(
				monthlyTrends.getByRole("heading", { name: "サンプル党｜月ごとの収支の推移" }),
			).toBeVisible();
			// グラフ（apexcharts）は読み込み後にクライアントで描かれるため、棒が描かれるまで待つ
			const chart = monthlyTrends.getByRole("img", { name: "月次収支推移グラフ" });
			await expect(chart.locator(".apexcharts-bar-area").first()).toBeVisible();
			await expect(monthlyTrends.getByText("データがありません")).toHaveCount(0);
			// 1月〜12月の軸と、収入・支出・収支の凡例が出ている
			await expect(chart.getByRole("application")).toContainText(/1月.*12月/);
			for (const legend of ["収入", "支出", "収支"]) {
				await expect(
					chart.getByRole("button", { name: new RegExp(`^${legend},`) }),
				).toBeVisible();
			}
		});

		test("貸借対照表に年度末時点の資産と負債が表示される", async ({ page }) => {
			const balanceSheet = page.locator("#balance-sheet");

			await expect(
				balanceSheet.getByRole("heading", {
					name: "サンプル党｜2025年12月31日時点の貸借対照表",
				}),
			).toBeVisible();

			const assets = balanceSheet.getByRole("region", { name: "資産", exact: true });
			await expect(assets).toContainText(/流動資産\s*300万円/);
			await expect(assets).toContainText(/債務超過\s*▲100万円/);

			const liabilities = balanceSheet.getByRole("region", {
				name: "負債・純資産",
				exact: true,
			});
			await expect(liabilities).toContainText(/固定負債\s*400万円/);
		});

		test("すべての出入金に新しい順の取引が表示される", async ({ page }) => {
			const table = page
				.locator("#transactions")
				.locator('table[aria-label="政治資金取引一覧表"]');

			await expect(table).toBeVisible();
			await expect(table.locator("tbody tr")).toHaveCount(6);
			await expect(table.getByRole("row", { name: /振込手数料/ })).toContainText(
				"2025.12.31",
			);
			await expect(table.getByRole("row", { name: /振込手数料/ })).toContainText(
				"-5,000",
			);
			await expect(table.getByRole("row", { name: /税理士報酬/ })).toContainText(
				"-150,000",
			);
		});

		test("所属議員の調研費のサマリーが表示される", async ({ page }) => {
			await expect(page.getByRole("heading", { name: "所属議員｜調研費のサマリー" })).toBeVisible();
			await expect(page.getByText("サンプル 太郎").first()).toBeVisible();
		});
	});

	test.describe("政治団体・年度セレクター", () => {
		test("セレクターをクリックするとシートが開く", async ({ page }) => {
			await page.goto("/o/sample-party/2026");

			// セレクターボタンをクリック
			const selectorButton = page.getByRole("button", { name: /サンプル党/ });
			await selectorButton.click();

			// ドロップダウンが開いて選択肢が表示される（表示する団体名／調研費（議員別）のグループ）
			await expect(page.getByText("表示する団体名", { exact: true })).toBeVisible();
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
