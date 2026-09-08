import { expect, test as setup } from "@playwright/test";
import { STORAGE_STATE } from "../../playwright.config";

setup("ログインして storageState を保存する", async ({ page }) => {
	await page.goto("/login");
	await page.getByLabel("Email").fill("foo@example.com");
	await page.getByLabel("Password").fill("foo@example.com");
	await page.getByRole("button", { name: "ログイン" }).click();
	await expect(page).toHaveURL("/");

	await page.context().storageState({ path: STORAGE_STATE });
});
