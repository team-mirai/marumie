import { test, expect, type Page } from "@playwright/test";

// サイト全体の主要な導線（トップ → 各ページ、ヘッダーのメガメニュー → 各ページ）を通し、
// 移った先のページが実行時エラーなく表示されることを確かめる。
// 各ページの中身の細かい確認は home / header / organization / research-fund の各 spec が持つ。

function collectPageErrors(page: Page): string[] {
	const errors: string[] = [];
	page.on("pageerror", (error) => {
		errors.push(`${error.name}: ${error.message}`);
	});
	return errors;
}

async function expectPartyPage(page: Page, year: number) {
	await expect(page).toHaveURL(`/o/sample-party/${year}`);
	const heading = page.getByRole("region", { name: "政党情報" });
	await expect(heading.getByText("サンプル党の収支")).toBeVisible();
	await expect(heading).toContainText(`政党・${year}年`);
}

async function expectGroupPage(page: Page, year: number) {
	await expect(page).toHaveURL(`/o/e2e-test-org/${year}`);
	await expect(page.getByRole("region", { name: "政治団体情報" })).toContainText(
		`E2Eテスト団体・${year}年`,
	);
	await expect(
		page.locator("#cash-flow").getByRole("heading", { level: 1, name: "収支の流れ" }),
	).toBeVisible();
}

async function expectPoliticianPage(page: Page) {
	await expect(page).toHaveURL("/p/sample-taro/2026");
	const cashFlow = page.locator("#cash-flow");
	await expect(cashFlow.getByText("サンプル 太郎の調研費・2026年")).toBeVisible();
	await expect(cashFlow.getByRole("heading", { level: 1, name: "収支の流れ" })).toBeVisible();
}

test.describe("主要な導線", () => {
	test.use({ viewport: { width: 1280, height: 800 } });

	test("トップの政党のカードから政党ページへ移れる", async ({ page }) => {
		const errors = collectPageErrors(page);
		await page.goto("/");

		await page
			.getByRole("region", { name: "政党の収支" })
			.getByRole("link", { name: "サンプル党の収支を詳しく", exact: true })
			.click();

		await expectPartyPage(page, 2026);
		expect(errors, `以下のエラーが発生しました:\n${errors.join("\n")}`).toHaveLength(0);
	});

	test("トップの所属議員の調研費から議員ページへ移れる", async ({ page }) => {
		const errors = collectPageErrors(page);
		await page.goto("/");

		await page
			.getByRole("region", { name: "所属議員の調研費" })
			.getByRole("link", { name: "サンプル 太郎の調研費を詳しく" })
			.click();

		await expectPoliticianPage(page);
		expect(errors, `以下のエラーが発生しました:\n${errors.join("\n")}`).toHaveLength(0);
	});

	test("ヘッダーのメガメニューから政党・政治団体・議員の各ページへ移れる", async ({ page }) => {
		const errors = collectPageErrors(page);
		const nav = page.getByRole("navigation", { name: "メインナビゲーション" });
		const menu = page.locator("#header-mega-menu");

		await page.goto("/");

		await nav.getByRole("button", { name: "政党・政治団体" }).click();
		await menu
			.getByRole("navigation", { name: "サンプル党の表示する年" })
			.getByRole("link", { name: "2025" })
			.click();
		await expectPartyPage(page, 2025);

		await nav.getByRole("button", { name: "政党・政治団体" }).click();
		await menu
			.getByRole("navigation", { name: "E2Eテスト団体の表示する年" })
			.getByRole("link", { name: "2025" })
			.click();
		await expectGroupPage(page, 2025);

		await nav.getByRole("button", { name: "調研費" }).click();
		await menu
			.getByRole("navigation", { name: "サンプル 太郎の調研費の表示する年" })
			.getByRole("link", { name: "2026" })
			.click();
		await expectPoliticianPage(page);

		await nav.getByRole("link", { name: "まる見え政治資金とは" }).click();
		await expect(page).toHaveURL("/about");

		expect(errors, `以下のエラーが発生しました:\n${errors.join("\n")}`).toHaveLength(0);
	});
});
