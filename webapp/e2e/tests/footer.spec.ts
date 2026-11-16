import { test, expect } from "@playwright/test";

const POLITICIAN_URL = "/p/sample-taro/2026";

test.describe("フッター", () => {
	test("サイトマップ → ロゴと SNS → 規約 の順に並ぶ", async ({ page }) => {
		await page.goto(POLITICIAN_URL);
		const footer = page.locator("footer");

		const parties = footer.getByRole("navigation", { name: "政党・政治団体" });
		await expect(
			parties.getByRole("link", { name: "サンプル党の収支" }),
		).toHaveAttribute("href", "/o/sample-party/2026");

		// 議員は公開中のデータから並ぶ。公開済みの仕訳が無いサンプル 花子・次郎は出ない
		const politicians = footer.getByRole("navigation", { name: "議員の調研費" });
		await expect(politicians.getByText("（五十音順）")).toBeVisible();
		await expect(
			politicians.getByRole("link", { name: "サンプル 太郎" }),
		).toHaveAttribute("href", "/p/sample-taro/2026");
		await expect(politicians.getByText(/サンプル 花子/)).toHaveCount(0);
		await expect(politicians.getByText(/サンプル 次郎/)).toHaveCount(0);

		const about = footer.getByRole("navigation", { name: "このサイトについて" });
		await expect(
			about.getByRole("link", { name: "まる見え政治資金とは" }),
		).toHaveAttribute("href", "/about");
		await expect(
			about.getByRole("link", { name: "データについて" }),
		).toHaveAttribute("href", "/#explanation");
		await expect(
			about.getByRole("link", { name: "よくあるご質問（別タブで開きます）" }),
		).toHaveAttribute("target", "_blank");

		await expect(
			footer.getByRole("link", { name: "まる見え政治資金 トップへ" }),
		).toHaveAttribute("href", "/");
		await expect(footer.getByRole("link", { name: "利用規約" })).toHaveAttribute(
			"href",
			"/terms",
		);
		await expect(
			footer.getByRole("link", { name: "プライバシーポリシー" }),
		).toHaveAttribute("href", "/privacy");
		await expect(
			footer.getByText("© 2025 Team Mirai All rights Reserved"),
		).toBeVisible();
	});

	test("SNS のアイコンは別タブで開き、だれの何かを読み上げる", async ({
		page,
	}) => {
		await page.goto("/");
		const footer = page.locator("footer");

		for (const name of [
			"YouTube",
			"X（旧Twitter）",
			"LINE",
			"Instagram",
			"Facebook",
			"TikTok",
		]) {
			const link = footer.getByRole("link", {
				name: `チームみらいの${name}（別タブで開きます）`,
			});
			await expect(link).toHaveAttribute("target", "_blank");
			await expect(link).toHaveAttribute("rel", "noopener noreferrer");
		}
	});
});
