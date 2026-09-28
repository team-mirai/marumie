import { test, expect } from "@playwright/test";

// シードで公開済みの調研費データを持つ議員（prisma/seeds/researchFundJournalEntries.ts）。
const PAGE_URL = "/p/sample-taro/2026";

test.describe("調査研究費 議員ページ", () => {
	test("B-1〜B-5 が表示され、実行時エラーが発生しないこと", async ({ page }) => {
		const errors: string[] = [];
		page.on("pageerror", (error) => {
			errors.push(`${error.name}: ${error.message}`);
		});

		const response = await page.goto(PAGE_URL);

		expect(response?.status()).toBe(200);
		await expect(page).toHaveTitle(
			/サンプル 太郎の調研費.*みらいまる見え政治資金/,
		);

		// 収支の流れ（KPI2枚＋サンキー）
		await expect(
			page
				.locator("#cash-flow")
				.getByRole("heading", { name: /サンプル 太郎・調研費.*収支の流れ/ }),
		).toBeVisible();
		await expect(page.locator("#cash-flow").getByText("支給総額")).toBeVisible();
		await expect(page.locator("#cash-flow").getByText("支出総額")).toBeVisible();
		await expect(
			page.locator('[role="img"][aria-label="調査研究費の使いみちの流れ図"]'),
		).toBeVisible();

		// B-2 1年間の推移
		await expect(
			page.locator('#monthly-trends [role="img"][aria-label="月ごとの調査研究費の支給と支出"]'),
		).toBeVisible();

		// B-3 活用方針と主な用途
		await expect(
			page.locator("#highlights").getByText("サンプル 太郎の調研費の活用方針"),
		).toBeVisible();
		await expect(page.getByText("タウンミーティングの開催")).toBeVisible();
		// URL の無い成果物は「報告は準備中」と出す
		await expect(page.getByText("開催報告：報告は準備中")).toBeVisible();

		// B-4 すべての出入金
		await expect(
			page
				.locator("#transactions")
				.getByRole("heading", { name: /サンプル 太郎・調研費.*すべての出入金/ }),
		).toBeVisible();

		// 透明性バンド
		await expect(
			page.getByRole("heading", { name: /調研費もまるごと公開/ }),
		).toBeVisible();
		await expect(page.getByRole("link", { name: "こちらのnote" })).toHaveAttribute(
			"href",
			"https://note.com/team_mirai_jp/n/n58fca6f9e4e8",
		);

		// B-5 データについて
		await expect(page.getByText("調研費のデータについて")).toBeVisible();
		await expect(
			page.getByText(/使わなかった分（.*）は年末時点で確定し、国庫に返還します。/),
		).toBeVisible();

		// 政党ページへの導線
		await expect(
			page.getByRole("link", { name: /政党・チームみらいの「まる見え政治資金」も公開中/ }),
		).toHaveAttribute("href", "/o/team-mirai");

		expect(errors, `以下のエラーが発生しました:\n${errors.join("\n")}`).toHaveLength(0);
	});

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

	test("領収書のある行だけに「領収書」ピルが出て、押すとモーダルで開ける", async ({
		page,
	}) => {
		await page.goto(PAGE_URL);
		const section = page.locator("#transactions");
		const rows = section.locator('[id^="tx-"]');

		// シードでは 8/2 イヤホン代（画像）と 8/1 新聞購読料（PDF）にだけ領収書がある
		await expect(section.getByRole("button", { name: "領収書を見る" })).toHaveCount(2);
		await expect(
			rows.filter({ hasText: "イヤホン代" }).getByRole("button", { name: "領収書を見る" }),
		).toBeVisible();
		await expect(
			rows.filter({ hasNotText: /イヤホン代|新聞購読料/ }).getByRole("button", {
				name: "領収書を見る",
			}),
		).toHaveCount(0);

		// 画像の領収書はモーダルの中に出す。ハイドレーション前のクリックを取りこぼさないよう押し直す。
		const dialog = page.getByRole("dialog", { name: "領収書" });
		await expect(async () => {
			await rows
				.filter({ hasText: "イヤホン代" })
				.getByRole("button", { name: "領収書を見る" })
				.click();
			await expect(dialog).toBeVisible({ timeout: 1_000 });
		}).toPass();
		await expect(dialog.getByRole("img", { name: "イヤホン代の領収書" })).toBeAttached();
		await dialog.getByRole("button", { name: "閉じる", exact: true }).click();
		await expect(dialog).toHaveCount(0);

		// PDF は別タブで原本を開くリンクを出す。Esc で閉じる
		await rows
			.filter({ hasText: "新聞購読料" })
			.getByRole("button", { name: "領収書を見る" })
			.click();
		await expect(dialog.getByRole("link", { name: "新聞購読料の領収書を開く" })).toHaveAttribute(
			"target",
			"_blank",
		);
		await page.keyboard.press("Escape");
		await expect(dialog).toHaveCount(0);
	});

	test("キーボードで「領収書」ピルから開くと、フォーカスがモーダル内に移って閉じるとピルに戻る", async ({
		page,
	}) => {
		await page.goto(PAGE_URL);
		const pill = page
			.locator("#transactions")
			.locator('[id^="tx-"]')
			.filter({ hasText: "新聞購読料" })
			.getByRole("button", { name: "領収書を見る" });
		const dialog = page.getByRole("dialog", { name: "領収書" });
		const closeButton = dialog.getByRole("button", { name: "閉じる", exact: true });
		const openLink = dialog.getByRole("link", { name: "新聞購読料の領収書を開く" });

		// ハイドレーション前のキー入力を取りこぼさないよう押し直す
		await expect(async () => {
			await pill.focus();
			await page.keyboard.press("Enter");
			await expect(dialog).toBeVisible({ timeout: 1_000 });
		}).toPass();
		await expect(closeButton).toBeFocused();

		// Tab / Shift+Tab はダイアログ内を循環する
		await page.keyboard.press("Tab");
		await expect(openLink).toBeFocused();
		await page.keyboard.press("Tab");
		await expect(closeButton).toBeFocused();
		await page.keyboard.press("Shift+Tab");
		await expect(openLink).toBeFocused();

		await page.keyboard.press("Escape");
		await expect(dialog).toHaveCount(0);
		await expect(pill).toBeFocused();
	});

	test("「用途N」のある行では「領収書」ピルと並んで出る", async ({ page }) => {
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
		await expect(row.getByRole("button", { name: "領収書を見る" })).toBeVisible();
		await expect(row.getByRole("button", { name: "用途1を見る" })).toBeVisible();
	});

	test("SP 幅でも「領収書」ピルが見えて押せる", async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto(PAGE_URL);
		const pill = page
			.locator("#transactions")
			.locator('[id^="tx-"]')
			.filter({ hasText: "イヤホン代" })
			.getByRole("button", { name: "領収書を見る" });

		await expect(pill).toBeVisible();
		const dialog = page.getByRole("dialog", { name: "領収書" });
		await expect(async () => {
			await pill.click();
			await expect(dialog).toBeVisible({ timeout: 1_000 });
		}).toPass();
		// 背景を押して閉じる
		await page.mouse.click(10, 835);
		await expect(dialog).toHaveCount(0);
	});

	test("全件ページでも領収書のある行に「領収書」ピルが出て、モーダルで開ける", async ({
		page,
	}) => {
		await page.goto(`${PAGE_URL}/transactions`);
		const pill = page.getByRole("button", { name: "領収書を見る" });

		await expect(pill).toHaveCount(3);
		const dialog = page.getByRole("dialog", { name: "領収書" });
		await expect(async () => {
			await pill.first().click();
			await expect(dialog).toBeVisible({ timeout: 1_000 });
		}).toPass();
		await expect(dialog.getByText("イヤホン代")).toBeVisible();
	});

	test("全件ページでもキーボードで開いて Esc で閉じると、フォーカスがピルに戻る", async ({ page }) => {
		await page.goto(`${PAGE_URL}/transactions`);
		const pill = page.getByRole("button", { name: "領収書を見る" }).first();
		const dialog = page.getByRole("dialog", { name: "領収書" });

		await expect(async () => {
			await pill.focus();
			await page.keyboard.press("Enter");
			await expect(dialog).toBeVisible({ timeout: 1_000 });
		}).toPass();
		await expect(dialog.getByRole("button", { name: "閉じる", exact: true })).toBeFocused();

		await page.keyboard.press("Escape");
		await expect(dialog).toHaveCount(0);
		await expect(pill).toBeFocused();
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

test.describe("調査研究費 政党トップページのサマリー", () => {
	const ORG_URL = "/o/sample-party/2026";

	test("調研費のサマリーが表示され、実行時エラーが発生しないこと", async ({ page }) => {
		const errors: string[] = [];
		page.on("pageerror", (error) => {
			errors.push(`${error.name}: ${error.message}`);
		});

		await page.goto(ORG_URL);
		const section = page.locator("#research-fund");

		// 見出し・サブ
		await expect(
			section.getByRole("heading", { name: /所属議員.*調研費のサマリー/ }),
		).toBeVisible();
		await expect(
			section.getByText("議員に毎月100万円支給される公費を、何に使ったか"),
		).toBeVisible();

		// 「調研費とは」コラプスは初期状態で閉じている
		await expect(section.getByText("調研費とは")).toBeVisible();
		await expect(
			section.getByText(/第三者による承認を自主基準として定めています/),
		).toBeHidden();

		// 公開中の議員が1名だけなので、その議員のチップと「他議員も今後追加」が並ぶ
		await expect(
			section.getByText("他議員も今後追加", { exact: true }),
		).toBeVisible();
		await expect(section.getByText("試験公開中")).toBeVisible();
		await expect(section.getByText(/分を公開中$/)).toBeVisible();

		// KPI 2枚とサンキー
		await expect(section.getByText("支給総額")).toBeVisible();
		await expect(section.getByText("支出総額")).toBeVisible();
		await expect(
			section.locator(
				'[role="img"][aria-label="調査研究費の使いみちの流れ図"]',
			),
		).toBeVisible();
		await expect(
			section.getByText("支給額の1%未満の費目は「その他」にまとめています。"),
		).toBeVisible();

		expect(
			errors,
			`以下のエラーが発生しました:\n${errors.join("\n")}`,
		).toHaveLength(0);
	});

	test("「{氏名}の調研費を詳しく」から議員ページに遷移する", async ({
		page,
	}) => {
		await page.goto(ORG_URL);

		await page
			.locator("#research-fund")
			.getByRole("link", { name: "サンプル 太郎の調研費を詳しく" })
			.click();

		await expect(page).toHaveURL(/\/p\/sample-taro\/2026$/);
	});

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
