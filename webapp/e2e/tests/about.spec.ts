import { test, expect } from "@playwright/test";

test.describe("まる見え政治資金とはページ", () => {
	test.beforeEach(async ({ page }) => {
		const response = await page.goto("/about");
		expect(response?.status()).toBe(200);
	});

	test("パンくず・見出しが表示され、作成中の案内は出ない", async ({ page }) => {
		await expect(page).toHaveTitle("まる見え政治資金とは｜まる見え政治資金｜チームみらい");

		const breadcrumbs = page.getByRole("navigation", { name: "パンくずリスト", exact: true });
		await expect(breadcrumbs.getByRole("link", { name: "トップ" })).toHaveAttribute("href", "/");
		await expect(breadcrumbs.getByText("まる見え政治資金とは")).toBeVisible();
		await expect(
			page.getByRole("navigation", { name: "パンくずリスト（ページ下部）" }),
		).toBeVisible();

		await expect(
			page.getByRole("heading", { level: 1, name: "政党と議員のお金の流れをまる見えに" }),
		).toBeVisible();
		await expect(page.getByText("このページは作成中です")).toHaveCount(0);
	});

	test("v9 の順にセクションが並ぶ", async ({ page }) => {
		const headings = page.getByRole("heading", { level: 2 });
		const titles = await headings.allTextContents();
		const order = [
			"これまでの収支報告書との違い",
			"「政治とカネ」の問題を終わらせる、その一歩目として。",
			"議員の調研費についても公開",
			"まる見え政治資金を使いたい議員／政治団体の方へ",
		].map((title) => titles.indexOf(title));
		expect(order.every((index) => index >= 0)).toBe(true);
		expect([...order].sort((a, b) => a - b)).toEqual(order);
		expect(titles.filter((title) => title === "まる見え政治資金を使いたい議員／政治団体の方へ")).toHaveLength(1);
	});

	test("現時点で公開している収支の数を、公開中のデータから数えて出す", async ({ page }) => {
		const published = page.getByRole("region", { name: /^現時点（\d+年\d+月\d+日時点）で公開している収支：\d+/ });
		await expect(published).toBeVisible();
		await expect(published.getByText("現時点で公開している収支")).toBeVisible();
	});

	test("外部リンクは v9 と同じ先を別タブで開く", async ({ page }) => {
		const links = [
			{
				name: "導入を希望する（Googleフォームが別タブで開きます）",
				href: "https://forms.gle/sPx3jFbYCSRamqEE6",
			},
			{
				name: "ソースコードを見る（GitHubが別タブで開きます）",
				href: "https://github.com/team-mirai/marumie",
			},
			{
				name: "チームみらいの調研費の使用方針を読む（noteが別タブで開きます）",
				href: "https://note.com/team_mirai_jp/n/n9ec9166d0e1e",
			},
			{
				name: "公開時のお知らせを読む（noteが別タブで開きます）",
				href: "https://note.com/team_mirai_jp/n/n58fca6f9e4e8",
			},
		];
		for (const { name, href } of links) {
			const link = page.getByRole("link", { name, exact: true });
			await expect(link).toHaveAttribute("href", href);
			await expect(link).toHaveAttribute("target", "_blank");
		}
	});

	test("調研費の説明動画はミュート・ループで再生する", async ({ page }) => {
		const video = page.locator('video[src="/about/rf-members3-trim3.mp4"]');
		await expect(video).toBeVisible();
		expect(await video.evaluate((el: HTMLVideoElement) => el.muted && el.loop)).toBe(true);
		await expect(video).not.toHaveAttribute("controls");
	});

	test("ページ下部に「データについて」のブロックが表示される", async ({ page }) => {
		const notes = page.getByRole("region", { name: "データについて" });
		for (const title of ["データの出典", "免責事項"]) {
			await expect(notes.getByRole("heading", { name: title, exact: true })).toBeVisible();
		}
	});

	test("ヘッダーとフッターが表示される", async ({ page }) => {
		await expect(page.locator("header")).toBeVisible();
		await expect(page.locator("footer")).toBeVisible();
	});
});

test.describe("まる見え政治資金とはページ（動きを減らす設定）", () => {
	test.use({ reducedMotion: "reduce" });

	test("説明動画を自動再生せず、コントロールを出す", async ({ page }) => {
		await page.goto("/about");
		const video = page.locator('video[src="/about/rf-members3-trim3.mp4"]');
		await expect(video).toHaveAttribute("controls");
		expect(await video.evaluate((el: HTMLVideoElement) => el.paused)).toBe(true);
	});
});
