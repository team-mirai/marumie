import { test, expect, type Locator, type Page } from "@playwright/test";
import { clickUntil } from "../helpers/interactions";
import {
	deleteTransactions,
	mfCsv,
	previewCsv,
	saveCsv,
	switchTargetYear,
} from "../helpers/transactions";

// シードの取引（2025 年度）は寄付者・取引先がすべて紐付け済みなので、未紐付けの取引を CSV で取り込んで使う。
// 他の spec の取引と混ざらないよう、どの spec も使っていない年度を対象にする。
const ASSIGN_YEAR = 2018;
const DONOR_TRANSACTION = {
	no: "8001",
	description: "E2E紐付け 個人寄附",
	row: `8001,${ASSIGN_YEAR}/04/10,普通預金,,,,対象外,,30000,個人からの寄附,,,,対象外,,30000,E2E紐付け 個人寄附,寄附,`,
};
// 事務所費は 5 万円以上で取引先が必須になる（「取引先必須のみ表示」の既定の絞り込みに含まれる）
const COUNTERPART_TRANSACTION = {
	no: "8002",
	description: "E2E紐付け 事務所家賃",
	row: `8002,${ASSIGN_YEAR}/05/20,事務所費,,,,対象外,,60000,普通預金,,,,対象外,,60000,E2E紐付け 事務所家賃,家賃,`,
};

/** 前回の実行で取り込んだ取引を消し、未紐付けの取引を 1 件取り込み直す */
async function importUnassignedTransaction(page: Page, transaction: { no: string; row: string }) {
	await deleteTransactions(page, ASSIGN_YEAR, [transaction.no]);
	await previewCsv(page, ASSIGN_YEAR, "assign.csv", mfCsv([transaction.row]));
	await saveCsv(page, 1);
}

/** 摘要で取引を絞り込む */
async function searchTransactions(page: Page, query: string) {
	await page.getByLabel("摘要、メモ、相手先で検索").fill(query);
	await clickUntil(page.getByRole("button", { name: "検索" }), (options) =>
		expect(page).toHaveURL(/search=/, options),
	);
}

/** 行の「紐付け」/「変更」を押して紐付けダイアログを開き、候補を検索して選び、確定する */
async function assignFromDialog(
	page: Page,
	row: Locator,
	{
		button,
		searchLabel,
		candidate,
		submit,
	}: { button: string; searchLabel: string; candidate: string; submit: RegExp },
) {
	const dialog = page.getByRole("dialog");
	await clickUntil(row.getByRole("button", { name: button, exact: true }), (options) =>
		expect(dialog).toBeVisible(options),
	);
	await dialog.getByLabel(searchLabel).fill(candidate);
	// アクセシブルネームでは全角スペースが半角に正規化されるので、空白はどちらにも一致させる
	await dialog
		.getByRole("option", { name: new RegExp(candidate.replace(/\s/g, "\\s")) })
		.click();
	await dialog.getByRole("button", { name: submit }).click();
	await expect(dialog).toBeHidden();
}

test.describe("寄付者・取引先の紐付け", () => {
	// CSV の取り込みから紐付け・変更・再読み込みまでを 1 本で通すため、既定の 30 秒では足りない。
	// 取り込みを並列に走らせないよう、同一ワーカーで順番に実行する
	test.describe.configure({ mode: "default", timeout: 90_000 });

	test.beforeEach(async ({ context }) => {
		await switchTargetYear(context, ASSIGN_YEAR);
	});

	test("寄付者を紐付けると紐付け済みとして表示され、別の寄付者に変更できる", async ({ page }) => {
		await importUnassignedTransaction(page, DONOR_TRANSACTION);

		await page.goto("/assign/donors");
		await expect(page.getByRole("heading", { name: "寄付者紐付け管理", level: 1 })).toBeVisible();
		await expect(page.getByRole("main")).toContainText(`サンプル党／${ASSIGN_YEAR}年度`);

		// 既定は「未紐付けのみ表示」。取り込んだ取引に絞り込む
		await searchTransactions(page, DONOR_TRANSACTION.description);
		const row = page.getByRole("row", { name: new RegExp(DONOR_TRANSACTION.description) });
		await expect(row).toContainText("未紐付け");

		await assignFromDialog(page, row, {
			button: "紐付け",
			searchLabel: "寄付者を検索",
			candidate: "寄附　太郎",
			submit: /この寄付者を紐付け/,
		});

		// 紐付け済みになったので「未紐付けのみ表示」からは消える
		await expect(row).toBeHidden();

		// 「未紐付けのみ表示」を外すと、紐付けた寄付者とともに紐付け済みとして表示される
		await clickUntil(page.getByLabel("未紐付けのみ表示"), (options) =>
			expect(page).toHaveURL(/unassigned=false/, options),
		);
		await expect(row).toContainText("紐付け済み");
		await expect(row).toContainText("寄附　太郎");

		await assignFromDialog(page, row, {
			button: "変更",
			searchLabel: "寄付者を検索",
			candidate: "寄附　花子",
			submit: /この寄付者を紐付け/,
		});
		await expect(row).toContainText("寄附　花子");
		await expect(row).not.toContainText("寄附　太郎");

		// 再読み込みしても紐付けが保たれている
		await page.reload();
		await expect(row).toContainText("紐付け済み");
		await expect(row).toContainText("寄附　花子");
	});

	test("取引先を紐付けると紐付け済みとして表示され、別の取引先に変更できる", async ({ page }) => {
		await importUnassignedTransaction(page, COUNTERPART_TRANSACTION);

		await page.goto("/assign/counterparts");
		await expect(page.getByRole("heading", { name: "取引先紐付け管理", level: 1 })).toBeVisible();
		await expect(page.getByRole("main")).toContainText(`サンプル党／${ASSIGN_YEAR}年度`);

		// 既定は「未紐付けのみ表示」「取引先必須のみ表示」。取り込んだ取引に絞り込む
		await searchTransactions(page, COUNTERPART_TRANSACTION.description);
		const row = page.getByRole("row", { name: new RegExp(COUNTERPART_TRANSACTION.description) });
		await expect(row).toContainText("未紐付け");
		await expect(row).toContainText("取引先必須");

		await assignFromDialog(page, row, {
			button: "紐付け",
			searchLabel: "取引先を検索",
			candidate: "不動産管理株式会社",
			submit: /紐付け \(1件\)/,
		});

		// 紐付け済みになったので「未紐付けのみ表示」からは消える
		await expect(row).toBeHidden();

		// 「未紐付けのみ表示」を外すと、紐付けた取引先とともに紐付け済みとして表示される
		await clickUntil(page.getByLabel("未紐付けのみ表示"), (options) =>
			expect(page).toHaveURL(/unassigned=false/, options),
		);
		await expect(row).toContainText("紐付け済み");
		await expect(row).toContainText("不動産管理株式会社");

		await assignFromDialog(page, row, {
			button: "変更",
			searchLabel: "取引先を検索",
			candidate: "NTT東日本",
			submit: /紐付け \(1件\)/,
		});
		await expect(row).toContainText("NTT東日本");
		await expect(row).not.toContainText("不動産管理株式会社");

		// 再読み込みしても紐付けが保たれている
		await page.reload();
		await expect(row).toContainText("紐付け済み");
		await expect(row).toContainText("NTT東日本");
	});
});
