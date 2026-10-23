import { expect, type BrowserContext, type Page } from "@playwright/test";
import { clickUntil } from "./interactions";

const MF_CSV_HEADER =
	"取引No,取引日,借方勘定科目,借方補助科目,借方部門,借方取引先,借方税区分,借方インボイス,借方金額(円),貸方勘定科目,貸方補助科目,貸方部門,貸方取引先,貸方税区分,貸方インボイス,貸方金額(円),摘要,タグ,メモ";

/** MFクラウド会計の仕訳帳形式の CSV を組み立てる */
export function mfCsv(rows: string[]): string {
	return `${[MF_CSV_HEADER, ...rows].join("\n")}\n`;
}

/**
 * グローバル対象の年度を `year` に切り替える（政治団体は auth.setup で選んだ「サンプル党」のまま）。
 * 対象は cookie（URL エンコードした org:<政治団体ID>:<年度>）で持つので、auth.setup で選んだ値の年度だけを差し替える。
 *
 * シード取引（2025 年度）や他の spec の取引と混ざらないよう、spec ごとに専用の年度を使うためのもの。
 */
export async function switchTargetYear(context: BrowserContext, year: number) {
	const cookies = await context.cookies();
	const target = cookies.find((cookie) => cookie.name.startsWith("admin-target-"));
	const organizationId = /^org:(\d+):\d{4}$/.exec(
		decodeURIComponent(target?.value ?? ""),
	)?.[1];
	if (!target || !organizationId) {
		throw new Error("auth.setup で選んだグローバル対象の cookie が見つかりません");
	}
	await context.addCookies([
		{ ...target, value: encodeURIComponent(`org:${organizationId}:${year}`) },
	]);
}

/** 前回の実行で取り込んだ取引を取引一括削除で消し、対象年度を空に戻す */
export async function deleteTransactions(page: Page, year: number, transactionNos: string[]) {
	await page.goto("/bulk-delete-transactions");
	await expect(page.getByRole("main")).toContainText(`サンプル党／${year}年度`);

	await page.getByLabel(/取引番号/).fill(transactionNos.join(","));
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
export async function previewCsv(page: Page, year: number, name: string, content: string) {
	await page.goto("/upload-csv");
	await expect(page.getByRole("main")).toContainText(`サンプル党／${year}年度`);

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
export async function saveCsv(page: Page, savedCount: number) {
	await page.getByRole("button", { name: "このデータを保存する" }).click();
	// 重複をスキップしたときは「新規保存」と表示される。CI には webapp が無くキャッシュの無効化に失敗するが、
	// 保存自体は成功として扱われる（#1838）ので、エラー詳細が出ていないことも確かめる
	await expect(page.getByRole("status").filter({ hasText: "件を処理し" })).toContainText(
		new RegExp(`${savedCount}件を(新規)?保存`),
		{ timeout: 30_000 },
	);
	await expect(page.getByText("エラー詳細:", { exact: true })).toHaveCount(0);
}
