import { test, expect } from "@playwright/test";

// 政治団体系ページはページ内の政治団体セレクタを持たず、サイドバー上部で選んだ
// グローバル対象（政治団体 × 年度）に追従する。auth.setup で「サンプル党／2025年度」を
// 選んでいるので、各ページの本文にその対象が出ることをスモークとして確認する。
const PAGES = [
	{ path: "/transactions", heading: "取引一覧" },
	{ path: "/bulk-delete-transactions", heading: "取引一括削除" },
	{ path: "/upload-csv", heading: "CSVアップロード" },
	{ path: "/balance-snapshots", heading: "残高登録" },
	{ path: "/assign/counterparts", heading: "取引先紐付け管理" },
	{ path: "/assign/donors", heading: "寄付者紐付け管理" },
	{ path: "/import-donors", heading: "寄付者一括インポート" },
	{ path: "/export-report", heading: "報告書エクスポート" },
];

test.describe("グローバル対象への追従", () => {
	for (const { path, heading } of PAGES) {
		test(`${path} が対象を表示し、ページ内セレクタを持たない`, async ({ page }) => {
			await page.goto(path);

			await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
			await expect(page.getByRole("main")).toContainText("サンプル党／2025年度");
			await expect(page.getByRole("main").getByLabel("政治団体")).toHaveCount(0);
		});
	}

	test("対象が未選択なら別の団体に勝手に切り替えず、選択を促す", async ({ page, context }) => {
		await context.clearCookies({ name: /^admin-target-/ });
		await page.goto("/transactions");

		await expect(page.getByRole("main")).toContainText("政治団体が選択されていません");
		await expect(
			page.getByRole("main").getByRole("button", { name: "対象を切り替え" }),
		).toBeVisible();
	});

	test("取引先詳細の取引一覧も対象に追従する", async ({ page }) => {
		await page.goto("/counterparts");
		await page.getByRole("link", { name: "東京電力株式会社" }).click();

		await expect(page.getByRole("heading", { name: "取引先詳細", level: 1 })).toBeVisible();
		await expect(page.getByRole("main")).toContainText("サンプル党／2025年度");
	});
});
