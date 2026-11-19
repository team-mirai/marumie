import { test, expect } from "@playwright/test";

test.describe("政治団体管理", () => {
	test.describe("読み込み", () => {
		test("政治団体一覧ページが正常に表示される", async ({ page }) => {
			await page.goto("/political-organizations");

			await expect(page.getByRole("heading", { name: "政治団体一覧" })).toBeVisible();
			await expect(page.getByRole("link", { name: "新規作成" })).toBeVisible();
		});

		test("既存の政治団体が一覧に表示される", async ({ page }) => {
			await page.goto("/political-organizations");

			// サイドバー上部のグローバル対象にも団体名が出るため、本文領域にスコープする
			await expect(page.getByRole("main").getByText("サンプル党")).toBeVisible();
		});

		test("政治団体の編集ページが正常に表示される", async ({ page }) => {
			await page.goto("/political-organizations");

			// 特定の団体（サンプル党）の編集リンクを選択
			const samplePartyCard = page
				.locator("h3")
				.filter({ hasText: "サンプル党" })
				.locator("xpath=ancestor::div[contains(@class, 'border')]");
			await samplePartyCard.getByRole("link", { name: "編集" }).click();

			// CardTitleはdiv要素としてレンダリングされるため、getByTextを使用
			await expect(page.getByText(/を編集/).first()).toBeVisible();
			await expect(page.getByLabel(/表示名/)).toBeVisible();
			await expect(page.getByLabel(/スラッグ/)).toBeVisible();
		});

		test("編集ページで既存の政治団体データが読み込まれる", async ({ page }) => {
			await page.goto("/political-organizations");

			// 特定の団体（サンプル党）の編集リンクを選択
			const samplePartyCard = page
				.locator("h3")
				.filter({ hasText: "サンプル党" })
				.locator("xpath=ancestor::div[contains(@class, 'border')]");
			await samplePartyCard.getByRole("link", { name: "編集" }).click();

			const displayNameInput = page.getByLabel(/表示名/);
			await expect(displayNameInput).toHaveValue("サンプル党");

			const slugInput = page.getByLabel(/スラッグ/);
			await expect(slugInput).toHaveValue("sample-party");
		});
	});

	test.describe("書き込み", () => {
		test("新しい政治団体を作成できる", async ({ page }) => {
			await page.goto("/political-organizations/new");

			// CardTitleはdiv要素としてレンダリングされるため、getByTextを使用
			await expect(page.getByText("新しい政治団体を作成")).toBeVisible();

			const uniqueSlug = `test-org-${Date.now()}`;
			const displayName = `テスト政治団体 ${Date.now()}`;

			await page.getByLabel(/表示名/).fill(displayName);
			await page.getByLabel(/スラッグ/).fill(uniqueSlug);
			await page.getByLabel("説明（任意）").fill("E2Eテストで作成された政治団体");

			await page.getByRole("button", { name: "作成" }).click();

			await expect(page).toHaveURL("/political-organizations");
			await expect(page.getByText(displayName)).toBeVisible();
		});

		test("既存の政治団体の情報を更新できる", async ({ page }) => {
			await page.goto("/political-organizations/new");

			const uniqueSlug = `update-test-${Date.now()}`;
			const originalName = `更新テスト用団体 ${Date.now()}`;

			await page.getByLabel(/表示名/).fill(originalName);
			await page.getByLabel(/スラッグ/).fill(uniqueSlug);
			await page.getByRole("button", { name: "作成" }).click();

			await expect(page).toHaveURL("/political-organizations");
			await expect(page.getByText(originalName)).toBeVisible();

			// 作成した政治団体のカードを特定して編集リンクをクリック
			// h3要素（政治団体名）を含む親カードを特定し、その中の編集リンクをクリック
			const orgHeading = page.locator("h3").filter({ hasText: originalName });
			const orgCard = orgHeading.locator("xpath=ancestor::div[contains(@class, 'border')]");
			await orgCard.getByRole("link", { name: "編集" }).click();

			// CardTitleはdiv要素としてレンダリングされるため、getByTextを使用
			await expect(page.getByText(/を編集/).first()).toBeVisible();

			const updatedName = `${originalName} (更新済み)`;
			await page.getByLabel(/表示名/).fill(updatedName);
			await page.getByLabel("説明（任意）").fill("E2Eテストで更新された説明");

			await page.getByRole("button", { name: "更新" }).click();

			await expect(page).toHaveURL("/political-organizations");
			await expect(page.getByText(updatedName)).toBeVisible();
		});

		test("公式サイト・SNS を保存でき、編集画面を開き直すと表示される", async ({ page }) => {
			await page.goto("/political-organizations/new");

			const uniqueSlug = `links-test-${Date.now()}`;
			const name = `リンクテスト用団体 ${Date.now()}`;
			await page.getByLabel(/表示名/).fill(name);
			await page.getByLabel(/スラッグ/).fill(uniqueSlug);
			await page.getByRole("button", { name: "作成" }).click();
			await expect(page).toHaveURL("/political-organizations");

			const orgHeading = page.locator("h3").filter({ hasText: name });
			const orgCard = orgHeading.locator("xpath=ancestor::div[contains(@class, 'border')]");
			await orgCard.getByRole("link", { name: "編集" }).click();
			await expect(page.getByText(/を編集/).first()).toBeVisible();
			const editUrl = page.url();

			// 入力欄の型（url）は通るが http(s) ではない値は、保存時にサーバーで弾かれる
			await page.getByLabel("公式サイトの URL").fill("ftp://example.jp");
			await page.getByRole("button", { name: "更新" }).click();
			await expect(page.getByText("公式サイトの URL を正しく入力してください")).toBeVisible();
			await expect(page).toHaveURL(editUrl);

			await page.getByLabel("公式サイトの URL").fill("https://example.jp");
			await page.getByRole("button", { name: "SNS を追加" }).click();
			await page.getByLabel("SNS の URL（1件目）").fill("https://x.com/example");
			await page.getByRole("button", { name: "SNS を追加" }).click();
			await page.getByLabel("SNS の URL（2件目）").fill("https://www.youtube.com/@example");
			await page.getByRole("button", { name: "更新" }).click();
			await expect(page).toHaveURL("/political-organizations");

			await page.goto(editUrl);
			await expect(page.getByLabel("公式サイトの URL")).toHaveValue("https://example.jp");
			await expect(page.getByLabel("SNS の URL（1件目）")).toHaveValue("https://x.com/example");
			await expect(page.getByLabel("SNS の URL（2件目）")).toHaveValue(
				"https://www.youtube.com/@example",
			);
		});

		test("必須項目が空の場合は作成ボタンが無効になる", async ({ page }) => {
			await page.goto("/political-organizations/new");

			const createButton = page.getByRole("button", { name: "作成" });
			await expect(createButton).toBeDisabled();

			await page.getByLabel(/表示名/).fill("テスト");
			await expect(createButton).toBeDisabled();

			await page.getByLabel(/スラッグ/).fill("test-slug");
			await expect(createButton).toBeEnabled();
		});
	});
});
