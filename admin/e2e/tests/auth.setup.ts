import { expect, test as setup } from "@playwright/test";
import { STORAGE_STATE } from "../../playwright.config";

setup("ログインしてグローバル対象を選び storageState を保存する", async ({ page }) => {
	await page.goto("/login");
	await page.getByLabel("Email").fill("foo@example.com");
	await page.getByLabel("Password").fill("foo@example.com");
	await page.getByRole("button", { name: "ログイン" }).click();
	await expect(page).toHaveURL("/");

	// 政治団体系ページはグローバル対象（政治団体 × 年度）に追従するため、
	// シードの取引がある「サンプル党／2025年度」を全テスト共通の対象として選んでおく。
	await page.getByRole("button", { name: "現在の対象を切り替え" }).click();
	await page
		.getByRole("dialog")
		.getByRole("button", { name: "サンプル党／2025年度" })
		.click();
	await expect(page).toHaveURL("/political-organizations");

	await page.context().storageState({ path: STORAGE_STATE });
});
