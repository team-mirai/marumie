import { expect, type Page, test } from "@playwright/test";

// ロールごとの見え方を確かめるため、共通の認証済み（admin）storageState は使わずにログインし直す
test.use({ storageState: { cookies: [], origins: [] } });

async function loginAs(page: Page, email: string) {
	await page.goto("/login");
	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Password").fill(email);
	await page.getByRole("button", { name: "ログイン" }).click();
	await expect(page).toHaveURL("/");
}

/** 開けない画面はダッシュボードへ戻される */
async function expectRedirectedToDashboard(page: Page, path: string) {
	await page.goto(path);
	await expect(page).toHaveURL("/");
	await expect(page.getByRole("heading", { name: "ダッシュボード" })).toBeVisible();
}

test.describe("political_fund だけのユーザー", () => {
	test.beforeEach(async ({ page }) => {
		await loginAs(page, "bar@example.com");
	});

	test("メニューに政治団体は出るが、議員（調査研究費）とユーザー管理は出ない", async ({ page }) => {
		const sidebar = page.getByRole("complementary");

		await expect(sidebar.getByRole("link", { name: "政治団体" })).toBeVisible();
		await expect(sidebar.getByRole("link", { name: "議員", exact: true })).toHaveCount(0);
		await expect(sidebar.getByRole("link", { name: "ユーザー管理" })).toHaveCount(0);
		await expect(sidebar.getByText("政治資金", { exact: true })).toBeVisible();
	});

	test("対象切り替えに議員室が出ない", async ({ page }) => {
		await page.getByRole("button", { name: "現在の対象を切り替え" }).click();
		const dialog = page.getByRole("dialog");

		await expect(dialog.getByRole("button", { name: /^サンプル党／/ }).first()).toBeVisible();
		await expect(dialog.getByRole("button", { name: /サンプル 太郎/ })).toHaveCount(0);
	});

	test("調査研究費・admin 限定の画面に入れない", async ({ page }) => {
		await expectRedirectedToDashboard(page, "/politicians");
		await expectRedirectedToDashboard(page, "/politicians/1/books");
		await expectRedirectedToDashboard(page, "/politicians/1/books/1/entries");
		await expectRedirectedToDashboard(page, "/users");
		await expectRedirectedToDashboard(page, "/sync-export");
	});

	test("調査研究費の Route Handler は 403 で拒否される", async ({ page }) => {
		const response = await page.request.get(
			"/api/research-fund/books/1/submission-ledger?politicianId=1&house=representatives",
		);
		expect(response.status()).toBe(403);
	});

	test("政治資金の画面は開ける", async ({ page }) => {
		await page.goto("/political-organizations");
		await expect(page).toHaveURL("/political-organizations");
	});
});

test.describe("research_fund だけのユーザー", () => {
	test.beforeEach(async ({ page }) => {
		await loginAs(page, "baz@example.com");
	});

	test("メニューに議員は出るが、政治団体とユーザー管理は出ない", async ({ page }) => {
		const sidebar = page.getByRole("complementary");

		await expect(sidebar.getByRole("link", { name: "議員", exact: true })).toBeVisible();
		await expect(sidebar.getByRole("link", { name: "政治団体" })).toHaveCount(0);
		await expect(sidebar.getByRole("link", { name: "ユーザー管理" })).toHaveCount(0);
		await expect(sidebar.getByText("調査研究費", { exact: true })).toBeVisible();
	});

	test("対象切り替えに政治団体が出ない", async ({ page }) => {
		await page.getByRole("button", { name: "現在の対象を切り替え" }).click();
		const dialog = page.getByRole("dialog");

		await expect(dialog.getByRole("button", { name: /サンプル 太郎/ }).first()).toBeVisible();
		await expect(dialog.getByRole("button", { name: /^サンプル党／/ })).toHaveCount(0);
	});

	test("政治資金・admin 限定の画面に入れない", async ({ page }) => {
		await expectRedirectedToDashboard(page, "/political-organizations");
		await expectRedirectedToDashboard(page, "/transactions");
		await expectRedirectedToDashboard(page, "/upload-csv");
		await expectRedirectedToDashboard(page, "/export-report");
		await expectRedirectedToDashboard(page, "/users");
		await expectRedirectedToDashboard(page, "/politicians/new");
	});

	test("政治資金の Route Handler は 403 で拒否される", async ({ page }) => {
		const response = await page.request.get("/api/transactions");
		expect(response.status()).toBe(403);
	});

	test("議員一覧は開けるが、議員の追加・編集・削除はできない", async ({ page }) => {
		await page.goto("/politicians");
		await expect(page.getByRole("heading", { name: "議員一覧" })).toBeVisible();
		await expect(page.getByRole("link", { name: "年度帳簿" }).first()).toBeVisible();
		await expect(page.getByRole("link", { name: "議員を追加" })).toHaveCount(0);
		await expect(page.getByRole("link", { name: "編集" })).toHaveCount(0);
		await expect(page.getByRole("button", { name: "削除" })).toHaveCount(0);
	});
});
