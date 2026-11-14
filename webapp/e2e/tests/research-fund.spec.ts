import { test, expect } from "@playwright/test";

// シードで公開済みの調研費データを持つ議員（prisma/seeds/researchFundJournalEntries.ts）。
const PAGE_URL = "/p/sample-taro/2026";

test.describe("調査研究費 議員ページ", () => {
	test("v8 の本文が上から順に表示され、実行時エラーが発生しないこと", async ({ page }) => {
		const errors: string[] = [];
		page.on("pageerror", (error) => {
			errors.push(`${error.name}: ${error.message}`);
		});

		const response = await page.goto(PAGE_URL);

		expect(response?.status()).toBe(200);
		await expect(page).toHaveTitle(
			/サンプル 太郎の調研費.*みらいまる見え政治資金/,
		);

		// パンくず
		const breadcrumbs = page.getByRole("navigation", { name: "パンくずリスト" });
		await expect(breadcrumbs.getByRole("link", { name: "トップ" })).toHaveAttribute("href", "/");
		await expect(breadcrumbs.getByText("サンプル 太郎の調研費")).toBeVisible();

		// 収支の流れ（ページの最初の見出し。支給総額・支出総額＋区分タブつきのサンキー）
		const cashFlow = page.locator("#cash-flow");
		await expect(cashFlow.getByText("サンプル 太郎の調研費・2026年")).toBeVisible();
		await expect(cashFlow.getByRole("heading", { level: 1, name: "収支の流れ" })).toBeVisible();
		await expect(cashFlow.getByText(/^\d{4}年\d{1,2}月〜\d{1,2}月支給分$/).first()).toBeVisible();
		await expect(cashFlow.getByText("調研費とは")).toBeVisible();
		await expect(cashFlow.getByText("支給総額")).toBeVisible();
		await expect(cashFlow.getByText("支出総額")).toBeVisible();
		await expect(cashFlow.getByRole("tab", { name: "詳細の区分" })).toHaveAttribute(
			"aria-selected",
			"true",
		);
		await expect(cashFlow.getByRole("tab", { name: "法律上の区分" })).toBeVisible();
		await expect(
			page.locator('[role="img"][aria-label="調査研究費の使いみちの流れ図"]'),
		).toBeVisible();
		await expect(
			cashFlow.getByText("※年末までに使われなかった未使用分は国庫に返納されます。"),
		).toBeVisible();

		// 活用方針と主な用途
		await expect(
			page.locator("#highlights").getByRole("heading", { name: "活用方針と主な用途" }),
		).toBeVisible();
		await expect(
			page.locator("#highlights").getByText("サンプル 太郎の調研費の活用方針"),
		).toBeVisible();
		await expect(page.getByText("タウンミーティングの開催")).toBeVisible();
		// URL の無い成果物は「報告は準備中」と出す
		await expect(page.getByText("開催報告：報告は準備中")).toBeVisible();

		// 透明性の帯
		await expect(
			page.getByRole("heading", {
				name: "調研費もまるごと公開。意味ある使い方か、検証できるように👀",
			}),
		).toBeVisible();
		await expect(page.getByRole("link", { name: "こちらのnote" })).toHaveCount(0);

		// 月ごとの支出の推移・すべての出入金
		await expect(
			page.locator("#monthly-trends").getByRole("heading", { name: "月ごとの支出の推移" }),
		).toBeVisible();
		await expect(
			page.locator('#monthly-trends [role="img"][aria-label="月ごとの調査研究費の支給と支出"]'),
		).toBeVisible();
		await expect(
			page.locator("#transactions").getByRole("heading", { name: "すべての出入金" }),
		).toBeVisible();

		// セクションの順
		const order = await page
			.locator("#cash-flow, #highlights, #monthly-trends, #transactions, #explanation")
			.evaluateAll((sections) => sections.map((section) => section.id));
		expect(order).toEqual([
			"cash-flow",
			"highlights",
			"monthly-trends",
			"transactions",
			"explanation",
		]);

		// 共通の下部ブロック（データについては議員ページ用の文言）
		await expect(
			page.getByRole("heading", { name: /少しずつ進んでいますがまだまだです/ }),
		).toBeVisible();
		await expect(page.getByRole("link", { name: /まる見え政治資金とは？/ })).toBeVisible();
		const notes = page.locator("#explanation");
		await expect(notes.getByRole("heading", { name: "まる見え政治資金について" })).toBeVisible();
		await expect(notes.getByRole("heading", { name: "調研費のデータについて" })).toBeVisible();
		await expect(notes.getByText(/仕訳が完了した支出を掲載しています。/)).toBeVisible();
		await expect(notes.getByText(/調査研究広報滞在費に係る使途等報告書/)).toBeVisible();
		await expect(notes.getByRole("heading", { name: "データの出典" })).toHaveCount(0);

		// 外したもの：政党ページへの導線カード、試験公開のお知らせ、党の紹介、寄附・党員の応援カード
		await expect(
			page.getByRole("link", { name: /政党・チームみらいの「まる見え政治資金」も公開中/ }),
		).toHaveCount(0);
		await expect(page.getByText(/法律より一足先に試験公開中/)).toHaveCount(0);
		await expect(page.locator("main #about")).toHaveCount(0);
		await expect(page.locator("main").getByText("寄附で応援する")).toHaveCount(0);

		expect(errors, `以下のエラーが発生しました:\n${errors.join("\n")}`).toHaveLength(0);
	});

	for (const { label, viewport } of [
		{ label: "PC", viewport: { width: 1280, height: 800 } },
		{ label: "SP", viewport: { width: 390, height: 844 } },
	]) {
		test(`${label}: 冒頭に議員カードを出し、公開中の議員が1人だけなら前後の切り替えとほかの議員を出さない`, async ({
			page,
		}) => {
			await page.setViewportSize(viewport);
			await page.goto(PAGE_URL);
			const card = page.getByRole("region", { name: "議員情報" });

			await expect(card.getByText("サンプル 太郎", { exact: true }).locator("visible=true")).toBeVisible();
			// シードの議員は顔写真が未登録なので人型のアイコンになる
			await expect(
				card.getByRole("img", { name: "サンプル 太郎の写真" }).locator("visible=true"),
			).toBeVisible();
			// シードで調研費を公開中かつ公開済みの仕訳があるのはサンプル 太郎だけ
			await expect(card.getByRole("link", { name: /の調研費へ$/ })).toHaveCount(0);
			await expect(page.getByRole("heading", { name: "ほかの議員の調研費" })).toHaveCount(0);
		});
	}

	test("SP 幅では収支の流れを全体表示し、ピンチで拡大できると添える", async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto(PAGE_URL);
		const cashFlow = page.locator("#cash-flow");

		await expect(cashFlow.getByText("ピンチで拡大できます")).toBeVisible();
		// 支給期間と更新日はカードの末尾に1行で出す
		await expect(cashFlow.getByText(/支給分　\d{4}\.\d{1,2}\.\d{1,2}更新$/)).toBeVisible();
		const chart = page.locator('[role="img"][aria-label="調査研究費の使いみちの流れ図"]');
		const box = await chart.boundingBox();
		expect(box?.width ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(390);
	});

	for (const { label, viewport } of [
		{ label: "PC", viewport: { width: 1280, height: 800 } },
		{ label: "SP", viewport: { width: 390, height: 844 } },
	]) {
		test(`${label} 幅で月次グラフの領域に縦スクロールが出ない`, async ({ page }) => {
			await page.setViewportSize(viewport);
			await page.goto(PAGE_URL);
			const chart = page.locator(
				'#monthly-trends [role="img"][aria-label="月ごとの調査研究費の支給と支出"]',
			);
			await expect(chart).toBeVisible();

			// 横スクロール用のラッパー（overflow-x: auto）が縦方向にはみ出していないこと
			const overflow = await chart.evaluate((svg) => {
				let node = svg.parentElement;
				while (node && getComputedStyle(node).overflowX !== "auto") {
					node = node.parentElement;
				}
				if (!node) throw new Error("横スクロール用のラッパーが見つからない");
				return { scrollHeight: node.scrollHeight, clientHeight: node.clientHeight };
			});
			expect(overflow.scrollHeight).toBeLessThanOrEqual(overflow.clientHeight);

			// 読み上げ用の月別金額は引き続き支援技術に公開されている
			await expect(
				page.locator("#monthly-trends").getByRole("table", {
					name: "月ごとの調査研究費の支給と支出",
				}),
			).toHaveCount(1);
		});
	}

	test("未公開（下書き・確認済）の仕訳は表示されない", async ({ page }) => {
		await page.goto(PAGE_URL);
		const section = page.locator("#transactions");

		// シードでは 8/10 以降が未公開（確認済・下書き）。新しい順の先頭は公開済みの 8/2 になる。
		await expect(section.getByText(/^2026\.8\.(1|2|3)\d$/)).toHaveCount(0);
		await expect(section.locator('[id^="tx-"]').first()).toContainText("2026.8.2");
	});

	test("新しい順に先頭6件だけが出て、もっと見るで全件ページに遷移する", async ({
		page,
	}) => {
		await page.goto(PAGE_URL);
		const section = page.locator("#transactions");

		await expect(section.locator('[id^="tx-"]')).toHaveCount(6);
		// 月切り替え・区分タブは出さない
		await expect(section.getByRole("button", { name: "8月", exact: true })).toHaveCount(0);
		await expect(section.getByRole("button", { name: "法律上の区分" })).toHaveCount(0);

		await section.getByRole("link", { name: "もっと見る" }).click();
		await expect(page).toHaveURL(/\/p\/sample-taro\/2026\/transactions$/);
	});

	test("領収書のある行にも「領収書」ピルが出ず、モーダルも開けない", async ({ page }) => {
		await page.goto(PAGE_URL);
		const section = page.locator("#transactions");

		// シードでは 8/2 イヤホン代と 8/1 新聞購読料に領収書があるが、当面は領収書を公開しない
		await expect(section.locator('[id^="tx-"]').filter({ hasText: "イヤホン代" })).toBeVisible();
		await expect(page.getByRole("button", { name: "領収書を見る" })).toHaveCount(0);
		await expect(page.getByRole("dialog", { name: "領収書" })).toHaveCount(0);
	});

	test("「用途N」のピルは、領収書のある行でも今までどおり出る", async ({ page }) => {
		await page.goto(PAGE_URL);
		const section = page.locator("#transactions");
		const card = page
			.locator('[id^="highlight-"]')
			.filter({ hasText: "意見受付窓口の開設" });

		await expect(async () => {
			await card.getByRole("button", { name: "1件" }).click();
			await expect(section.getByRole("button", { name: "用途1を見る" })).toBeVisible({
				timeout: 1_000,
			});
		}).toPass();
		const row = section.locator('[id^="tx-"]').filter({ hasText: "ボネクタ利用料" });
		await expect(row.getByRole("button", { name: "用途1を見る" })).toBeVisible();
		await expect(row.getByRole("button", { name: "領収書を見る" })).toHaveCount(0);
	});

	test("SP 幅でも「領収書」ピルが出ない", async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto(PAGE_URL);

		await expect(
			page.locator("#transactions").locator('[id^="tx-"]').filter({ hasText: "イヤホン代" }),
		).toBeVisible();
		await expect(page.getByRole("button", { name: "領収書を見る" })).toHaveCount(0);
	});

	test("全件ページでも、PC・SP とも「領収書」ピルが出ない", async ({ page }) => {
		await page.goto(`${PAGE_URL}/transactions`);
		await expect(page.locator("#transactions").getByText("イヤホン代").first()).toBeVisible();
		await expect(page.getByRole("button", { name: "領収書を見る" })).toHaveCount(0);

		await page.setViewportSize({ width: 390, height: 844 });
		await page.reload();
		await expect(page.locator("#transactions").getByText("イヤホン代").first()).toBeVisible();
		await expect(page.getByRole("button", { name: "領収書を見る" })).toHaveCount(0);
	});

	test("全件ページの SP 幅でも、タブで並び替えてカテゴリーで絞り込める", async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto(`${PAGE_URL}/transactions`);
		const table = page.locator("#transactions");
		const toTime = (text: string) => {
			const [y, m, d] = text.split(".").map(Number);
			return new Date(y, m - 1, d).getTime();
		};
		const firstDate = () => table.getByText(/^\d{4}\.\d{1,2}\.\d{1,2}$/).first().innerText();

		// PC のヘッダー行は隠れ、SP のタブで操作する
		await expect(table.getByRole("button", { name: "日付で並び替え" })).toBeHidden();
		await expect(table.getByRole("button", { name: "新しい順" })).toHaveAttribute("aria-pressed", "true");
		const newest = toTime(await firstDate());

		const oldTab = table.getByRole("button", { name: "古い順" });
		await expect(async () => {
			await oldTab.click();
			await expect(oldTab).toHaveAttribute("aria-pressed", "true", { timeout: 1_000 });
		}).toPass();
		expect(toTime(await firstDate())).toBeLessThan(newest);

		const filterButton = table.getByRole("button", { name: "カテゴリーで絞り込む" });
		await filterButton.click();
		await table.getByRole("button", { name: "（すべて選択）" }).click();
		await table.getByRole("button", { name: "OK" }).click();
		await expect(table.getByRole("status").filter({ hasText: "（絞り込み中）" })).toBeVisible();
		await expect(filterButton).not.toHaveText("");
	});

	test("公開済みの支給が入金の行として出金と同じ一覧に並ぶ", async ({ page }) => {
		await page.goto(`${PAGE_URL}/transactions`);
		const table = page.locator("#transactions");

		// シードでは 2〜8 月の 1 日に公開済みの支給が 100 万円ずつある
		const grantRow = table
			.locator("div.grid")
			.filter({ hasText: "調査研究広報滞在費 8月分" });
		await expect(grantRow).toHaveCount(1);
		await expect(grantRow.getByText("支給（入金）")).toBeVisible();
		await expect(grantRow).toContainText("+1,000,000");

		// 入金と出金の合計は足し合わせず、別々に出す
		const summary = table.getByRole("status").filter({ hasText: "件を表示中" });
		await expect(summary).toContainText("入金 7,000,000円");
		await expect(summary).toContainText("出金");

		// カテゴリー絞り込みで入金だけに絞れる。ハイドレーション前のクリックを取りこぼさないよう押し直す。
		const filterButton = table.getByRole("button", { name: "カテゴリーで絞り込む" });
		await expect(async () => {
			await filterButton.click();
			await expect(table.getByRole("button", { name: "支給（入金）" })).toBeVisible({
				timeout: 1_000,
			});
		}).toPass();
		await table.getByRole("button", { name: "支給（入金）" }).click();
		await table.getByRole("button", { name: "OK" }).click();
		await expect(summary).toHaveText(
			"1〜7 / 7件を表示中　入金 7,000,000円・出金 0円（絞り込み中）",
		);
	});

	test("全件ページの絞り込み・並び順・ページを URL で指定・共有でき、戻る操作で直前に戻る", async ({
		page,
	}) => {
		await page.goto(`${PAGE_URL}/transactions?categories=grant-income`);
		const table = page.locator("#transactions");
		const summary = table.getByRole("status").filter({ hasText: "件を表示中" });
		await expect(summary).toHaveText(
			"1〜7 / 7件を表示中　入金 7,000,000円・出金 0円（絞り込み中）",
		);

		// 不正な指定でもエラーにならず、一覧が出る
		await page.goto(`${PAGE_URL}/transactions?categories=nope&sort=name&order=up&page=999`);
		await expect(summary).toBeVisible();
		await expect(summary).not.toContainText("（絞り込み中）");

		// 行のカテゴリーのラベルは、そのカテゴリー1つで絞り込む通常のリンク
		await page.goto(`${PAGE_URL}/transactions`);
		const grantLink = table
			.locator("div.grid")
			.filter({ hasText: "調査研究広報滞在費 8月分" })
			.getByRole("link", { name: /^支給/ });
		await expect(grantLink).toHaveAttribute(
			"href",
			"/p/sample-taro/2026/transactions?categories=grant-income",
		);
		await grantLink.click();
		await expect(page).toHaveURL(/\/transactions\?categories=grant-income$/);
		await expect(summary).toContainText("（絞り込み中）");

		// 画面上の並び替えで URL が変わり、リロードしても同じ状態で開く
		await table.getByRole("button", { name: "金額で並び替え" }).click();
		await expect(page).toHaveURL(
			/\/transactions\?categories=grant-income&sort=amount&order=desc$/,
		);
		await page.reload();
		await expect(summary).toContainText("（絞り込み中）");

		// 戻る操作で直前の状態（並び替え前）に戻る
		await page.goBack();
		await expect(page).toHaveURL(/\/transactions\?categories=grant-income$/);
		await page.goBack();
		await expect(page).toHaveURL(/\/transactions$/);
		await expect(summary).not.toContainText("（絞り込み中）");
	});

	test("特記事項はⓘで開かず、項目名の下に常に出る", async ({ page }) => {
		await page.goto(PAGE_URL);
		const section = page.locator("#transactions");

		await expect(section.getByRole("button", { name: /の特記事項$/ })).toHaveCount(0);
		await expect(
			section.getByText("日経電子版 個人プラン 8月分サービス利用料").first(),
		).toBeVisible();
	});

	test("用途カードの件数を押すと、該当行まで一覧が広がって目立つ", async ({
		page,
	}) => {
		await page.goto(PAGE_URL);
		const section = page.locator("#transactions");
		const card = page
			.locator('[id^="highlight-"]')
			.filter({ hasText: "タウンミーティングの開催" });

		// 会場費（4/10）は先頭6件の外にある。ハイドレーション前のクリックを取りこぼさないよう押し直す。
		await expect(async () => {
			await card.getByRole("button", { name: "3件" }).click();
			await expect(section.locator('[data-flashed="true"]')).toHaveCount(3, {
				timeout: 1_000,
			});
		}).toPass();
		await expect(section.locator('[data-flashed="true"]').last()).toContainText(
			"会場費",
		);
	});

	test("明細の「用途N」を押すと、該当の用途カードが目立つ", async ({
		page,
	}) => {
		await page.goto(PAGE_URL);
		const section = page.locator("#transactions");
		const card = page
			.locator('[id^="highlight-"]')
			.filter({ hasText: "意見受付窓口の開設" });

		// 紐づく行（ボネクタ利用料）を件数リンクで一覧に出してから、行の「用途1」を押す。
		await expect(async () => {
			await card.getByRole("button", { name: "1件" }).click();
			await expect(section.getByRole("button", { name: "用途1を見る" })).toBeVisible({
				timeout: 1_000,
			});
		}).toPass();
		await section.getByRole("button", { name: "用途1を見る" }).click();
		await expect(card).toHaveClass(/border-\[#2AA693\]/);
	});

	test("ヘッダーのナビが同じ議員ページ内のセクションを指す", async ({ page }) => {
		await page.goto(PAGE_URL);

		const nav = page.getByRole("navigation", { name: "メインナビゲーション" });

		// 政治団体ページ（/o/...）へ飛ばず、調研費ページ内のセクションを指す。
		// next/link は末尾スラッシュを落とすので href は /p/[slug]/[year]#... になる。
		for (const section of [
			"cash-flow",
			"monthly-trends",
			"transactions",
			"explanation",
		]) {
			await expect(
				nav.locator(`a[href="/p/sample-taro/2026#${section}"]`),
			).toHaveCount(1);
		}
		await expect(nav.locator('a[href*="/o/"]')).toHaveCount(0);
	});

	test("フッターのアンカーが同じ議員ページ内のセクションを指す", async ({
		page,
	}) => {
		await page.goto(PAGE_URL);

		const footer = page.locator("footer");
		for (const [label, section] of [
			["収支の流れ", "cash-flow"],
			["月ごとの収支推移", "monthly-trends"],
			["すべての出入金", "transactions"],
			["データについて", "explanation"],
			["チームみらいについて", "about"],
		]) {
			await expect(
				footer.getByRole("link", { name: label, exact: true }).first(),
			).toHaveAttribute("href", `/p/sample-taro/2026#${section}`);
		}
	});

	test("組織セレクタの表示名が「{氏名}（調研費）」になる", async ({ page }) => {
		await page.goto(PAGE_URL);

		await expect(
			page.getByRole("button", { name: /サンプル 太郎（調研費）/ }),
		).toBeVisible();
	});

	test("存在しない議員のページは政治団体ページに寄せられる", async ({ page }) => {
		await page.goto("/p/no-such-politician/2026");

		await expect(page).toHaveURL(/\/o\/[\w-]+/);
	});
});

test.describe("調査研究費 グローバルナビ", () => {
	const ORG_URL = "/o/sample-party/2026";

	test("グローバルナビに「調査研究費」がある", async ({ page }) => {
		await page.goto(ORG_URL);

		await expect(
			page
				.getByRole("navigation", { name: "メインナビゲーション" })
				.getByRole("link", { name: "調査研究費" }),
		).toHaveAttribute("href", /#research-fund$/);
	});

	test("A-7 データについて に調研費の記載がある", async ({ page }) => {
		await page.goto(ORG_URL);

		await expect(
			page.locator("#explanation").getByText("調査研究費について"),
		).toBeVisible();
	});

	test("組織セレクタが団体と調研費（議員別）のグループになる", async ({
		page,
	}) => {
		await page.goto(ORG_URL);

		await page.getByRole("button", { name: /サンプル党/ }).first().click();

		await expect(page.getByText("表示する団体名", { exact: true })).toBeVisible();
		await expect(page.getByText("調研費（議員別）", { exact: true })).toBeVisible();
		await expect(page.getByText("対象年", { exact: true })).toBeVisible();

		// 議員を選ぶと議員ページに遷移する（A-6 の議員リストと取り違えないよう
		// 調査研究費グループの中だけを探す）
		await page
			.getByRole("button", { name: /サンプル 太郎 2026年/ })
			.click();
		await expect(page).toHaveURL(/\/p\/sample-taro\/2026$/);
	});

	test("組織セレクタの調研費（議員別）には公開済みの仕訳がある議員だけが出る", async ({
		page,
	}) => {
		// 政党ページの A-6 には準備中の議員が出るので、A-6 の無い議員ページで確かめる
		await page.goto("/p/sample-taro/2026");

		await page.getByRole("button", { name: /サンプル 太郎（調研費）/ }).click();

		await expect(page.getByText("調研費（議員別）", { exact: true })).toBeVisible();
		await expect(
			page.getByRole("button", { name: /サンプル 太郎 2026年/ }),
		).toBeVisible();
		// サンプル 花子・次郎は帳簿はあるが公開済みの仕訳が無いので、
		// 「〇〇 ほか N人」の準備中の行としても出ない
		await expect(page.getByText(/サンプル 花子/)).toHaveCount(0);
		await expect(page.getByText(/サンプル 次郎/)).toHaveCount(0);
		await expect(page.getByText(/ほか\d+人/)).toHaveCount(0);
	});
});
