import { readFile } from "node:fs/promises";
import { test, expect, type Locator, type Page } from "@playwright/test";
import * as iconv from "iconv-lite";
import { clickUntil } from "../helpers/interactions";

// auth.setup で選んだグローバル対象「サンプル党／2025年度」には、シードで報告書プロフィールと取引がある。
// 取引は他の spec（寄付者インポートなど）が並行して書き換えうるため、集計額はシードの値に固定せず、
// 「集計されていること（0 円でない・総括表の式が成り立つ）」と「プレビューと XML が一致すること」で確かめる。

/** 「項目名 | 値」形式テーブルの値セル（th の隣の td） */
function keyValueCell(page: Page, label: string): Locator {
	return page
		.getByRole("row")
		.filter({ has: page.getByRole("rowheader", { name: label, exact: true }) })
		.getByRole("cell");
}

/** 「¥1,234,567」形式の表示を数値にする */
async function readYen(cell: Locator): Promise<number> {
	const text = (await cell.textContent())?.trim() ?? "";
	expect(text).toMatch(/^¥-?[\d,]+$/);
	return Number(text.replace(/[¥,]/g, ""));
}

/** XML から最初に現れるタグの中身を取り出す */
function xmlText(xml: string, tag: string): string | undefined {
	return new RegExp(`<${tag}>([^<]*)</${tag}>`).exec(xml)?.[1];
}

async function readSummary(page: Page) {
	return {
		syunyuSgk: await readYen(keyValueCell(page, "収入総額")),
		zennenKksGk: await readYen(keyValueCell(page, "前年繰越額")),
		honnenSyunyuGk: await readYen(keyValueCell(page, "本年収入額")),
		sisyutuSgk: await readYen(keyValueCell(page, "支出総額")),
		yokunenKksGk: await readYen(keyValueCell(page, "翌年繰越額")),
		kojinKifuGk: await readYen(keyValueCell(page, "個人寄附")),
	};
}

test.describe("報告書エクスポート", () => {
	test("プレビューに対象団体・年度のプロフィールと取引の集計が表示される", async ({ page }) => {
		await page.goto("/export-report");

		await expect(page.getByRole("heading", { name: "報告書エクスポート", level: 1 })).toBeVisible();
		await expect(page.getByRole("tab", { name: "表形式プレビュー" })).toHaveAttribute(
			"aria-selected",
			"true",
		);

		// 団体基本情報はシードの報告書プロフィール（サンプル党／2025年）から作られる
		await expect(keyValueCell(page, "報告年")).toHaveText("2025");
		await expect(keyValueCell(page, "政治団体名称")).toHaveText("サンプル党");
		await expect(keyValueCell(page, "主たる事務所の所在地")).toHaveText(
			"東京都千代田区永田町一丁目1番1号 テストビル4階",
		);

		// 収支総括表は取引から集計される。0 円でなく、総括表の式が成り立つこと
		const summary = await readSummary(page);
		expect(summary.honnenSyunyuGk).toBeGreaterThan(0);
		expect(summary.sisyutuSgk).toBeGreaterThan(0);
		expect(summary.syunyuSgk).toBe(summary.zennenKksGk + summary.honnenSyunyuGk);
		expect(summary.yokunenKksGk).toBe(summary.syunyuSgk - summary.sisyutuSgk);
	});

	test("ダウンロードした XML にプレビューと同じ内容が入っている", async ({ page }) => {
		await page.goto("/export-report");
		await expect(keyValueCell(page, "政治団体名称")).toHaveText("サンプル党");

		const summary = await readSummary(page);

		// ダウンロードはクライアントの fetch → Blob 保存なので、ハイドレーション完了まで押し直す
		const downloadPromise = page.waitForEvent("download");
		await clickUntil(page.getByRole("button", { name: "XMLをダウンロード" }), (options) =>
			expect(page.getByText("XMLファイルをダウンロードしました")).toBeVisible(options),
		);
		const download = await downloadPromise;

		expect(download.suggestedFilename()).toMatch(/^report_2025_sample-party_\d{8}_\d{4}\.xml$/);

		// 提出用 XML は Shift_JIS で出力される
		const xml = iconv.decode(await readFile(await download.path()), "shift_jis");

		// 団体基本情報（SYUUSHI07_01）
		expect(xmlText(xml, "HOUKOKU_NEN")).toBe("2025");
		expect(xmlText(xml, "DANTAI_NM")).toBe("サンプル党");
		expect(xmlText(xml, "JIM_ADR")).toBe("東京都千代田区永田町一丁目1番1号");

		// 収支総括表（SYUUSHI07_02）がプレビューと一致する
		expect(xmlText(xml, "SYUNYU_SGK")).toBe(String(summary.syunyuSgk));
		expect(xmlText(xml, "ZENNEN_KKS_GK")).toBe(String(summary.zennenKksGk));
		expect(xmlText(xml, "HONNEN_SYUNYU_GK")).toBe(String(summary.honnenSyunyuGk));
		expect(xmlText(xml, "SISYUTU_SGK")).toBe(String(summary.sisyutuSgk));
		expect(xmlText(xml, "YOKUNEN_KKS_GK")).toBe(String(summary.yokunenKksGk));
		expect(xmlText(xml, "KOJIN_KIFU_GK")).toBe(String(summary.kojinKifuGk));
	});

	test("報告書プロフィールが未登録の団体では、登録を促す案内が表示される", async ({ page }) => {
		// 既存シードや他テストと干渉しないよう、プロフィールの無いテスト専用の政治団体を作成
		const orgName = `報告書未登録テスト団体 ${Date.now()}`;
		await page.goto("/political-organizations/new");
		await page.getByLabel(/表示名/).fill(orgName);
		await page.getByLabel(/スラッグ/).fill(`export-report-no-profile-${Date.now()}`);
		await page.getByRole("button", { name: "作成" }).click();
		await expect(page).toHaveURL("/political-organizations");

		// 作成した団体の当年度をグローバル対象に選ぶ（Cookie はこのテストのコンテキストだけに効く）
		const year = new Date().getFullYear();
		await clickUntil(page.getByRole("button", { name: "現在の対象を切り替え" }), (options) =>
			expect(page.getByRole("dialog")).toBeVisible(options),
		);
		await page
			.getByRole("dialog")
			.getByRole("button", { name: `${orgName}／${year}年度` })
			.click();
		await expect(page.getByRole("button", { name: "現在の対象を切り替え" })).toContainText(
			`${orgName}／${year}年度`,
		);

		await page.goto("/export-report");

		const main = page.getByRole("main");
		await expect(main).toContainText(
			`${year}年の報告書プロフィールが登録されていません。先にプロフィールを登録してください。`,
		);
		await expect(main.getByRole("link", { name: "プロフィール登録ページへ" })).toHaveAttribute(
			"href",
			new RegExp(`/political-organizations/\\d+/report-profile\\?year=${year}$`),
		);
		await expect(main.getByRole("button", { name: "XMLをダウンロード" })).toHaveCount(0);
		await expect(main.getByRole("tab", { name: "表形式プレビュー" })).toHaveCount(0);
	});
});
