import { readFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";
import { clickUntil } from "../helpers/interactions";

test.describe("調研費の同期用エクスポート", () => {
	test("選んだ議員室を 1 つの JSON にまとめてダウンロードできる", async ({ page }) => {
		await page.goto("/research-fund-sync-export");
		await expect(page.getByRole("heading", { name: "調研費の同期用エクスポート" })).toBeVisible();

		const download = page.getByRole("button", { name: "同期用JSONをダウンロード" });
		await expect(download).toBeDisabled();

		// チェックボックスはハイドレーション完了まで反応しないので、効くまで押し直す
		const taro = page.getByRole("checkbox", { name: /サンプル 太郎/ });
		await clickUntil(taro, (options) => expect(taro).toBeChecked(options));
		const hanako = page.getByRole("checkbox", { name: /サンプル 花子/ });
		await hanako.click();
		await expect(hanako).toBeChecked();
		await expect(page.getByText("2件選択中")).toBeVisible();

		const downloadPromise = page.waitForEvent("download");
		await download.click();
		const file = await downloadPromise;

		expect(file.suggestedFilename()).toMatch(/^marumie-research-fund-sync_\d{8}T\d{6}\.json$/);

		const json = JSON.parse(await readFile(await file.path(), "utf-8"));
		expect(json.meta.formatVersion).toBe(1);
		expect(json.meta.politicians.map((p: { slug: string }) => p.slug)).toEqual([
			"sample-hanako",
			"sample-taro",
		]);
		const taroData = json.politicians.find(
			(p: { profile: { slug: string } }) => p.profile.slug === "sample-taro",
		);
		expect(taroData.memberships[0].organizationSlug).toBe("sample-party");
		expect(taroData.profile).not.toHaveProperty("photoPath");
		// DB の ID・書類・ユーザーへの参照は含めない
		expect(JSON.stringify(json)).not.toMatch(
			/"(id|documentId|storageKey|maskedKey|createdById|updatedById)"/,
		);
	});
});
