import { test, expect } from "@playwright/test";

test.describe("報告書プロフィール", () => {
	test.describe("年度切り替え", () => {
		test("年度を切り替えてもフォームが正しく同期し、他の年度を上書きしない", async ({ page }) => {
			// 既存シードや他テストと干渉しないよう、テスト専用の政治団体を作成
			const uniqueSlug = `report-profile-year-${Date.now()}`;
			const orgName = `年度切替テスト団体 ${Date.now()}`;

			await page.goto("/political-organizations/new");
			await page.getByLabel(/表示名/).fill(orgName);
			await page.getByLabel(/スラッグ/).fill(uniqueSlug);
			await page.getByRole("button", { name: "作成" }).click();
			await expect(page).toHaveURL("/political-organizations");

			// 作成した政治団体の報告書プロフィール画面へ遷移
			const orgCard = page
				.locator("h3")
				.filter({ hasText: orgName })
				.locator("xpath=ancestor::div[contains(@class, 'border')]");
			await orgCard.getByRole("link", { name: "編集" }).click();
			await page.getByRole("link", { name: "報告書プロフィール" }).click();

			await expect(
				page.getByRole("heading", { name: new RegExp(`${orgName}.*報告書プロフィール`) }),
			).toBeVisible();

			// YearSelector の select（Label「報告年」に htmlFor で紐付いている）
			const yearSelect = page.getByLabel("報告年");

			// YearSelector の選択肢は currentYear から過去10年。
			// 実行年に依存しないよう、currentYear-1 と currentYear-2 を使う。
			const options = await yearSelect.locator("option").all();
			const yearA = await options[1].getAttribute("value");
			const yearB = await options[2].getAttribute("value");
			expect(yearA).toBeTruthy();
			expect(yearB).toBeTruthy();

			// 団体名称は Label に htmlFor が無いため、placeholder で一意に特定
			const officialNameInput = page.getByPlaceholder("政治団体の正式名称");
			const saveButton = page.getByRole("button", { name: /^保存/ });

			// yearA で新規保存
			await yearSelect.selectOption(yearA!);
			await expect(page).toHaveURL(new RegExp(`year=${yearA}`));
			await expect(officialNameInput).toHaveValue("");

			const yearAName = `${yearA}年の団体名 ${Date.now()}`;
			await officialNameInput.fill(yearAName);
			await saveButton.click();
			await expect(page.getByText("保存しました")).toBeVisible();

			// yearB に切り替え → フォームが空になっていること
			// （バグ再発時は yearA の入力値が残り、保存で yearA が上書きされる）
			await yearSelect.selectOption(yearB!);
			await expect(page).toHaveURL(new RegExp(`year=${yearB}`));
			await expect(officialNameInput).toHaveValue("");

			// yearB で別の値を保存
			const yearBName = `${yearB}年の団体名 ${Date.now()}`;
			await officialNameInput.fill(yearBName);
			await saveButton.click();
			await expect(page.getByText("保存しました")).toBeVisible();

			// yearA に戻す → yearA の保存内容が残っていること
			// （バグ再発時は yearB の保存で yearA が上書きされて yearBName が表示される）
			await yearSelect.selectOption(yearA!);
			await expect(page).toHaveURL(new RegExp(`year=${yearA}`));
			await expect(officialNameInput).toHaveValue(yearAName);

			// yearB に戻す → yearB の保存内容も残っていること
			await yearSelect.selectOption(yearB!);
			await expect(page).toHaveURL(new RegExp(`year=${yearB}`));
			await expect(officialNameInput).toHaveValue(yearBName);
		});
	});
});
