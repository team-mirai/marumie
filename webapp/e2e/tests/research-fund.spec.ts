import { test, expect, type Locator } from "@playwright/test";

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
			/サンプル 太郎の調査研究費.*みらいまる見え政治資金/,
		);

		// B-1 使いみちの流れ（KPI2枚＋サンキー）
		await expect(page.locator("#cash-flow").getByText("支給された")).toBeVisible();
		await expect(
			page.locator("#cash-flow").getByText("議員活動に使った"),
		).toBeVisible();
		await expect(
			page.locator('[role="img"][aria-label="調査研究費の使いみちの流れ図"]'),
		).toBeVisible();

		// B-2 1年間の推移
		await expect(
			page.locator('#monthly-trends [role="img"][aria-label="月ごとの調査研究費の支給と支出"]'),
		).toBeVisible();

		// B-3 活用方針と主要な成果
		await expect(
			page.locator("#highlights").getByText("サンプル 太郎の調査研究費の活用方針"),
		).toBeVisible();
		await expect(page.getByText("タウンミーティングの開催")).toBeVisible();
		// URL の無い成果物は「報告は準備中」と出す
		await expect(page.getByText("開催報告：報告は準備中")).toBeVisible();

		// B-4 すべての支出
		await expect(
			page.locator("#transactions").getByRole("heading", { name: /すべての支出/ }),
		).toBeVisible();

		// B-5 データについて
		await expect(page.getByText("調査研究費のデータについて")).toBeVisible();
		await expect(page.getByText(/余った分：.*は使っていません/)).toBeVisible();

		expect(errors, `以下のエラーが発生しました:\n${errors.join("\n")}`).toHaveLength(0);
	});

	test("未公開（下書き・確認済）の仕訳は表示されない", async ({ page }) => {
		await page.goto(PAGE_URL);

		await selectMonth(page.locator("#transactions"), "8月");

		// シードでは 8/10 以降が未公開（確認済・下書き）。8月を開いても出てこない。
		await expect(
			page.locator("#transactions").getByText(/^2026\.08\.(1|2|3)\d$/),
		).toHaveCount(0);
		await expect(
			page.locator("#transactions").getByText("2026.08.02").first(),
		).toBeVisible();
	});

	test("月を切り替えるとその月の支出だけが表示される", async ({ page }) => {
		await page.goto(PAGE_URL);
		const section = page.locator("#transactions");

		await selectMonth(section, "4月");
		await expect(section.getByText(/^4月の支出 \d+件・合計/)).toBeVisible();
		await expect(section.getByText(/^2026\.05\./)).toHaveCount(0);
	});

	test("区分トグルで法律上の区分に切り替えられる", async ({ page }) => {
		await page.goto(PAGE_URL);
		const section = page.locator("#transactions");
		const legalTab = section.getByRole("button", { name: "法律上の区分" });

		await expect(async () => {
			await legalTab.click();
			await expect(legalTab).toHaveAttribute("aria-pressed", "true");
		}).toPass();

		await expect(section.getByText(/^[①-⑩]\s/).first()).toBeVisible();
	});

	test("特記事項のⓘを押すと注記が開く", async ({ page }) => {
		await page.goto(PAGE_URL);
		const section = page.locator("#transactions");

		await selectMonth(section, "5月");
		const infoButton = section
			.getByRole("button", { name: /の特記事項$/ })
			.first();
		await expect(infoButton).toBeVisible();

		await expect(async () => {
			if ((await infoButton.getAttribute("aria-expanded")) !== "true") {
				await infoButton.click();
			}
			await expect(infoButton).toHaveAttribute("aria-expanded", "true");
		}).toPass();
	});

	test("ヘッダーのナビが同じ議員ページ内のセクションを指す", async ({ page }) => {
		await page.goto(PAGE_URL);

		const nav = page.getByRole("navigation", { name: "メインナビゲーション" });

		// 政治団体ページ（/o/...）へ飛ばず、B-1〜B-5 のアンカーを指す。
		// next/link は末尾スラッシュを落とすので href は /p/[slug]/[year]#... になる。
		for (const section of [
			"cash-flow",
			"highlights",
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

	test("存在しない議員のページは政治団体ページに寄せられる", async ({ page }) => {
		await page.goto("/p/no-such-politician/2026");

		await expect(page).toHaveURL(/\/o\/[\w-]+/);
	});
});

/** ハイドレーション前のクリックを取りこぼさないよう、選択が反映されるまで押す。 */
async function selectMonth(section: Locator, label: string) {
	const button = section.getByRole("button", { name: label, exact: true });
	await expect(button).toBeVisible();
	await expect(async () => {
		await button.click();
		await expect(button).toHaveAttribute("aria-pressed", "true");
	}).toPass();
}
