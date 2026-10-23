import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { clickUntil } from "../helpers/interactions";

// 取り込んだ取引が他の spec のシード取引（2025 年度）と混ざらないよう、
// どの spec も使っていない年度を対象にする。件数を決定的に検証でき、再実行にも耐える。
const IMPORT_YEAR = 2019;
const TRANSACTION_NOS = ["9001", "9002", "9003"];

const HEADER =
	"取引No,取引日,借方勘定科目,借方補助科目,借方部門,借方取引先,借方税区分,借方インボイス,借方金額(円),貸方勘定科目,貸方補助科目,貸方部門,貸方取引先,貸方税区分,貸方インボイス,貸方金額(円),摘要,タグ,メモ";

// 2 行目の摘要は欄の中に改行を含む（#1820 で 1 件が複数行に割れた形式）
const VALID_ROWS = [
	`9001,${IMPORT_YEAR}/04/10,普通預金,,,,対象外,,12345,個人からの寄附,,,,対象外,,12345,E2E取込 寄附A,寄附,`,
	`9002,${IMPORT_YEAR}/05/20,事務所費,,,,対象外,,23456,普通預金,,,,対象外,,23456,"E2E取込 家賃B\n5月分",家賃,`,
	`9003,${IMPORT_YEAR}/06/30,備品・消耗品費,,,,対象外,,34567,普通預金,,,,対象外,,34567,E2E取込 備品C,備品,`,
];

function csv(rows: string[]): string {
	return `${[HEADER, ...rows].join("\n")}\n`;
}

/**
 * グローバル対象を「サンプル党／IMPORT_YEAR年度」に切り替える。
 * 対象は cookie（URL エンコードした org:<政治団体ID>:<年度>）で持つので、auth.setup で選んだ値の年度だけを差し替える。
 */
async function switchToImportYear(context: BrowserContext) {
	const cookies = await context.cookies();
	const target = cookies.find((cookie) => cookie.name.startsWith("admin-target-"));
	const organizationId = /^org:(\d+):\d{4}$/.exec(
		decodeURIComponent(target?.value ?? ""),
	)?.[1];
	if (!target || !organizationId) {
		throw new Error("auth.setup で選んだグローバル対象の cookie が見つかりません");
	}
	await context.addCookies([
		{ ...target, value: encodeURIComponent(`org:${organizationId}:${IMPORT_YEAR}`) },
	]);
}

/** 前回の実行で取り込んだ取引を取引一括削除で消し、対象年度を空に戻す */
async function deleteImportedTransactions(page: Page) {
	await page.goto("/bulk-delete-transactions");
	await expect(page.getByRole("main")).toContainText(`サンプル党／${IMPORT_YEAR}年度`);

	await page.getByLabel(/取引番号/).fill(TRANSACTION_NOS.join(","));
	const result = page.getByRole("heading", { name: /該当なし|削除対象/ }).first();
	await clickUntil(page.getByRole("button", { name: "検索" }), (options) =>
		expect(result).toBeVisible(options),
	);

	const found = page.getByRole("heading", { name: /削除対象/ });
	if (await found.isVisible()) {
		const dialog = page.getByRole("dialog");
		await clickUntil(page.getByRole("button", { name: "削除", exact: true }), (options) =>
			expect(dialog).toBeVisible(options),
		);
		await clickUntil(dialog.getByRole("button", { name: "削除する" }), (options) =>
			expect(found).toBeHidden(options),
		);
	}
}

/** CSV をアップロードしてプレビューを表示する */
async function previewCsv(page: Page, name: string, content: string) {
	await page.goto("/upload-csv");
	await expect(page.getByRole("main")).toContainText(`サンプル党／${IMPORT_YEAR}年度`);

	// ハイドレーション前に載せたファイルは握り潰され「プレビューを表示」が押せないままになるため、
	// ファイルの選択からやり直す
	await expect(async () => {
		await page.getByLabel("CSVファイル", { exact: true }).setInputFiles({
			name,
			mimeType: "text/csv",
			buffer: Buffer.from(content, "utf-8"),
		});
		await page.getByRole("button", { name: "プレビューを表示" }).click({ timeout: 5_000 });
		await expect(page.getByRole("heading", { name: "取り込みプレビュー" })).toBeVisible({
			timeout: 10_000,
		});
	}).toPass({ timeout: 30_000 });
}

/** プレビュー中のデータを保存する */
async function saveCsv(page: Page, savedCount: number) {
	await page.getByRole("button", { name: "このデータを保存する" }).click();
	// 保存件数は成否どちらのメッセージにも含まれる。CI には webapp が無くキャッシュの無効化に失敗するため、
	// 成否ではなく「何件保存したか」で確かめる（取り込まれたかどうかは取引一覧で確かめる。#1838）
	await expect(page.getByRole("status").filter({ hasText: "件を処理し" })).toContainText(
		`${savedCount}件を保存`,
		{ timeout: 30_000 },
	);
}

/** 取り込みプレビューの取引の表（集計の表と区別する） */
function previewTable(page: Page) {
	return page
		.getByRole("table")
		.filter({ has: page.getByRole("columnheader", { name: /摘要/ }) });
}

async function gotoTransactions(page: Page) {
	await page.goto("/transactions");
	await expect(page.getByRole("heading", { name: "取引一覧" })).toBeVisible();
	await expect(page.getByRole("main")).toContainText(`サンプル党／${IMPORT_YEAR}年度`);
}

test.describe("CSVアップロード（MFクラウド会計）", () => {
	// 同じ年度・取引No の取引を取り込んでは消すため、並列に走らせず同一ワーカーで順番に実行する
	test.describe.configure({ mode: "default" });

	test.beforeEach(async ({ page, context }) => {
		await switchToImportYear(context);
		await deleteImportedTransactions(page);
	});

	test("プレビューに件数と内容が表示され、保存すると取引一覧に反映される", async ({ page }) => {
		await previewCsv(page, "import.csv", csv(VALID_ROWS));

		// 摘要の改行で行が割れず、3 件として読み込まれる
		await expect(page.getByRole("tab", { name: "全件 (3)" })).toBeVisible();
		await expect(page.getByRole("tab", { name: "挿入 (3)" })).toBeVisible();
		await expect(page.getByRole("tab", { name: "無効 (0)" })).toBeVisible();

		const preview = previewTable(page);
		await expect(preview.locator("tbody tr")).toHaveCount(3);
		await expect(preview.getByRole("row", { name: /E2E取込 寄附A/ })).toContainText("¥12,345");
		await expect(preview.getByRole("row", { name: /E2E取込 寄附A/ })).toContainText(
			"個人からの寄附",
		);
		await expect(preview.getByRole("row", { name: /E2E取込 家賃B/ })).toContainText("¥23,456");
		await expect(preview.getByRole("row", { name: /E2E取込 備品C/ })).toContainText("¥34,567");

		await saveCsv(page, 3);

		await gotoTransactions(page);
		await expect(page.getByText("全 3 件中 1 - 3 件を表示")).toBeVisible();
		const table = page.getByRole("table");
		await expect(table.getByRole("row", { name: /E2E取込 寄附A/ })).toContainText("9001");
		await expect(table.getByRole("row", { name: /E2E取込 寄附A/ })).toContainText("¥12,345");
		await expect(table.getByRole("row", { name: /E2E取込 家賃B/ })).toContainText("9002");
		await expect(table.getByRole("row", { name: /E2E取込 備品C/ })).toContainText("9003");
	});

	test("同じ CSV を再度取り込むと重複はスキップされ、内容が変わった取引だけ更新される", async ({
		page,
	}) => {
		await previewCsv(page, "import.csv", csv(VALID_ROWS));
		await saveCsv(page, 3);

		// 同じ CSV: すべて重複としてスキップされ、保存できない
		await previewCsv(page, "import.csv", csv(VALID_ROWS));
		await expect(page.getByRole("tab", { name: "スキップ (3)" })).toBeVisible();
		await expect(page.getByRole("tab", { name: "挿入 (0)" })).toBeVisible();
		await expect(page.getByText("重複のためスキップされます")).toHaveCount(3);
		await expect(page.getByRole("button", { name: "このデータを保存する" })).toBeDisabled();

		// 取引No が同じで金額が変わった行は更新になる
		const changedRows = [
			VALID_ROWS[0].replaceAll("12345", "54321"),
			VALID_ROWS[1],
			VALID_ROWS[2],
		];
		await previewCsv(page, "import-changed.csv", csv(changedRows));
		await expect(page.getByRole("tab", { name: "更新 (1)" })).toBeVisible();
		await expect(page.getByRole("tab", { name: "スキップ (2)" })).toBeVisible();
		await saveCsv(page, 1);

		await gotoTransactions(page);
		await expect(page.getByText("全 3 件中 1 - 3 件を表示")).toBeVisible();
		const updatedRow = page.getByRole("table").getByRole("row", { name: /E2E取込 寄附A/ });
		await expect(updatedRow).toContainText("¥54,321");
		await expect(updatedRow).not.toContainText("¥12,345");
	});

	test("不正な行はエラーとともに無効と表示され、取引一覧に取り込まれない", async ({ page }) => {
		const rows = [
			VALID_ROWS[0],
			`9002,${IMPORT_YEAR}/05/20,存在しない科目,,,,対象外,,23456,普通預金,,,,対象外,,23456,E2E取込 不正科目,家賃,`,
			`9003,${IMPORT_YEAR}/06/30,備品・消耗品費,,,,対象外,,34567,普通預金,,,,対象外,,34567,E2E取込 カテゴリなし,,`,
		];
		await previewCsv(page, "invalid-rows.csv", csv(rows));

		await expect(page.getByRole("tab", { name: "挿入 (1)" })).toBeVisible();
		await expect(page.getByRole("tab", { name: "無効 (2)" })).toBeVisible();
		const preview = previewTable(page);
		await expect(preview.getByRole("row", { name: /E2E取込 不正科目/ })).toContainText(
			'無効な借方科目: "存在しない科目"',
		);
		await expect(preview.getByRole("row", { name: /E2E取込 カテゴリなし/ })).toContainText(
			"独自のカテゴリが設定されていません",
		);

		await saveCsv(page, 1);

		await gotoTransactions(page);
		await expect(page.getByText("全 1 件中 1 - 1 件を表示")).toBeVisible();
		await expect(page.getByRole("table")).toContainText("E2E取込 寄附A");
		await expect(page.getByRole("table")).not.toContainText("E2E取込 不正科目");
		await expect(page.getByRole("table")).not.toContainText("E2E取込 カテゴリなし");
	});

	test("MFクラウド会計の形式でない CSV は形式の誤りがエラーとして表示され、保存できない", async ({
		page,
	}) => {
		await page.goto("/upload-csv");
		await expect(page.getByRole("main")).toContainText(`サンプル党／${IMPORT_YEAR}年度`);

		// 形式の誤りではプレビューが表示されないため、previewCsv ではなくエラー表示を待つ
		const alert = page.getByRole("alert").filter({ hasText: "プレビューに失敗しました" });
		await expect(async () => {
			await page.getByLabel("CSVファイル", { exact: true }).setInputFiles({
				name: "not-mf.csv",
				mimeType: "text/csv",
				buffer: Buffer.from("名前,金額\n山田,1000\n", "utf-8"),
			});
			await page.getByRole("button", { name: "プレビューを表示" }).click({ timeout: 5_000 });
			await expect(alert).toBeVisible({ timeout: 10_000 });
		}).toPass({ timeout: 30_000 });

		await expect(alert).toContainText("MFクラウド会計の仕訳帳の形式ではありません");
		await expect(page.getByRole("heading", { name: "取り込みプレビュー" })).toHaveCount(0);
		await expect(page.getByRole("button", { name: "このデータを保存する" })).toHaveCount(0);

		await gotoTransactions(page);
		await expect(page.getByText("トランザクションが登録されていません")).toBeVisible();
	});

	test("見出しだけでデータ行が無い CSV は取り込む取引が無いと表示され、保存できない", async ({
		page,
	}) => {
		await previewCsv(page, "header-only.csv", csv([]));

		await expect(page.getByText("取り込み対象の取引が見つかりませんでした。")).toBeVisible();
		await expect(page.getByRole("button", { name: "このデータを保存する" })).toHaveCount(0);
	});
});
