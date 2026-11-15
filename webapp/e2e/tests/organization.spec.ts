import { test, expect } from "@playwright/test";

test.describe("政治団体ページ", () => {
	test.describe("読み込み", () => {
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

			// 見出しカードが描画されるまで待機（networkidle依存を避ける）
			await expect(
				page.getByRole("region", { name: "政党情報" }).getByText("サンプル党の収支"),
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

		test("パンくずにトップと今のページが表示される", async ({ page }) => {
			const breadcrumbs = page.getByRole("navigation", { name: "パンくずリスト" });

			await expect(breadcrumbs.getByRole("link", { name: "トップ" })).toHaveAttribute(
				"href",
				"/",
			);
			await expect(breadcrumbs.getByText("サンプル党の収支")).toHaveAttribute(
				"aria-current",
				"page",
			);
		});

		test("見出しカードに収入・支出の総額と収支・現金残高が表示される", async ({ page }) => {
			const heading = page.getByRole("region", { name: "政党情報" });

			await expect(heading).toContainText("政党・2025年");
			await expect(heading).toContainText(/収入総額\s*1581万円/);
			await expect(heading).toContainText(/支出総額\s*1281万円/);
			await expect(heading).toContainText(/収支・現金残高\s*300万円/);
			// 区分タブつきの収支の流れ（サンキー図）も同じカードにある
			await expect(heading.getByRole("tab", { name: "詳細の区分" })).toHaveAttribute(
				"aria-selected",
				"true",
			);
			await heading.getByRole("tab", { name: "法律上の区分" }).click();
			await expect(heading.getByRole("tab", { name: "法律上の区分" })).toHaveAttribute(
				"aria-selected",
				"true",
			);
			await expect(
				heading.locator('#cash-flow [role="img"][aria-label="政治資金の収支フロー図"]'),
			).toBeVisible();
		});

		test("見出しカードの年の切り替えで年度が切り替わる", async ({ page }) => {
			const years = page
				.getByRole("region", { name: "政党情報" })
				.getByRole("navigation", { name: "表示する年" });

			await expect(years.getByRole("link", { name: "2025" })).toHaveAttribute(
				"aria-current",
				"page",
			);
			await years.getByRole("link", { name: "2026" }).click();

			await expect(page).toHaveURL("/o/sample-party/2026");
			await expect(page.getByRole("region", { name: "政党情報" })).toContainText(
				"政党・2026年",
			);
		});

		test("毎月の収支推移のグラフが描画される", async ({ page }) => {
			const monthlyTrends = page.locator("#monthly-trends");

			await expect(monthlyTrends).toContainText("サンプル党・2025年");
			await expect(
				monthlyTrends.getByRole("heading", {
					name: "毎月の収支推移",
					exact: true,
				}),
			).toBeVisible();
			// グラフ（apexcharts）は読み込み後にクライアントで描かれるため、棒が描かれるまで待つ
			const chart = monthlyTrends.getByRole("img", { name: "月次収支推移グラフ" });
			await expect(chart.locator(".apexcharts-bar-area").first()).toBeVisible();
			await expect(monthlyTrends.getByText("データがありません")).toHaveCount(0);
			// 1月〜12月の軸と、収入・支出・収支の凡例が出ている
			await expect(chart.locator(".apexcharts-xaxis-label tspan")).toHaveText(
				Array.from({ length: 12 }, (_, i) => `${i + 1}月`),
			);
			for (const legend of ["収入", "支出", "収支"]) {
				await expect(
					chart.getByRole("button", { name: new RegExp(`^${legend},`) }),
				).toBeVisible();
			}
		});

		test("貸借対照表に年度末時点の資産と負債が表示される", async ({ page }) => {
			const balanceSheet = page.locator("#balance-sheet");

			await expect(
				balanceSheet.getByRole("heading", { name: "貸借対照表", exact: true }),
			).toBeVisible();
			await expect(balanceSheet).toContainText("2025.12.31時点");

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

		test("セクションがデザインどおりの順で並ぶ", async ({ page }) => {
			const order = await page.evaluate(() => {
				const ids = ["monthly-trends", "balance-sheet", "transactions", "explanation"];
				return ids
					.map((id) => ({ id, top: document.getElementById(id)?.getBoundingClientRect().top }))
					.sort((a, b) => (a.top ?? 0) - (b.top ?? 0))
					.map(({ id }) => id);
			});
			expect(order).toEqual(["monthly-trends", "balance-sheet", "transactions", "explanation"]);
			await expect(
				page.getByRole("heading", { name: "党首もこれを見て、お金をやりくりしています👀" }),
			).toBeVisible();
		});

		test("共通の下部ブロック（帯・カード3枚・データについて）が表示される", async ({ page }) => {
			await expect(
				page.getByRole("heading", { name: /少しずつ進んでいますがまだまだです/ }),
			).toBeVisible();

			const cards = page.getByRole("navigation", { name: "このサイトについて" });
			await expect(cards.getByRole("link", { name: /まる見え政治資金とは？/ })).toHaveAttribute(
				"href",
				"/about",
			);
			await expect(cards.getByRole("link", { name: /よくあるご質問/ })).toHaveAttribute(
				"target",
				"_blank",
			);
			await expect(cards.getByRole("link", { name: /チームみらいについて/ })).toHaveAttribute(
				"href",
				"https://team-mir.ai/",
			);

			const notes = page.getByRole("region", { name: "データについて" });
			for (const title of ["まる見え政治資金について", "データの出典", "調査研究費について", "免責事項"]) {
				await expect(notes.getByRole("heading", { name: title, exact: true })).toBeVisible();
			}
		});

		test("調研費のサマリー・他団体へのリンク・寄附と党員の応援カードは出ない", async ({ page }) => {
			// ヘッダー・フッターのリンクは対象外（別 Issue）なので、本文の中だけを見る
			const main = page.locator("main");
			await expect(main.getByText("調研費のサマリー")).toHaveCount(0);
			await expect(main.getByText("寄附で応援する")).toHaveCount(0);
			await expect(main.getByText("チームみらい党員になる")).toHaveCount(0);
			await expect(main.getByText(/「まる見え政治資金」も公開中/)).toHaveCount(0);
			await expect(main.getByText(/これはまだ第一歩/)).toHaveCount(0);
			await expect(main.locator("#about")).toHaveCount(0);
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
