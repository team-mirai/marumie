import { test, expect } from "@playwright/test";

test.describe("サイドバー", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
	});

	test("ログインユーザーのメールアドレス・ロールとログアウトボタンが表示される", async ({ page }) => {
		const sidebar = page.getByRole("complementary");

		await expect(sidebar.getByText("foo@example.com")).toBeVisible();
		// 「ユーザー情報」ページは廃止したので、メールとロールはここだけで確認する
		await expect(sidebar.getByRole("link", { name: "ユーザー情報" })).toHaveCount(0);
		await expect(sidebar.getByText("admin", { exact: true })).toBeVisible();
		await expect(sidebar.getByRole("button", { name: "ログアウト" })).toBeVisible();
	});

	test("折りたたみボタンでアイコンレールと展開表示を切り替えられる", async ({ page }) => {
		const sidebar = page.getByRole("complementary");
		const transactionsLink = sidebar.getByRole("link", { name: "取引一覧" });

		// 展開状態: ラベルが見えている
		await expect(sidebar.getByText("ADMIN CONSOLE")).toBeVisible();
		await expect(transactionsLink).toBeVisible();

		// 折りたたむ: ラベル・セクション見出しは消えるが、リンク自体（アイコン + sr-only ラベル）は残る
		await sidebar.getByRole("button", { name: "サイドバーを折りたたむ" }).click();
		await expect(sidebar).toHaveAttribute("data-collapsed", "true");
		await expect(sidebar.getByText("ADMIN CONSOLE")).toBeHidden();
		await expect(sidebar.getByText("データ取り込み")).toBeHidden();
		await expect(transactionsLink).toBeVisible();
		await expect(transactionsLink).toHaveAttribute("href", "/transactions");

		// 再度展開する
		await sidebar.getByRole("button", { name: "サイドバーを開く" }).click();
		await expect(sidebar).toHaveAttribute("data-collapsed", "false");
		await expect(sidebar.getByText("ADMIN CONSOLE")).toBeVisible();
	});
});

	test("対象の選択をリロードと別タブで保持し、明示切り替えで議員室メニューに変わる", async ({ page, context }) => {
    await page.goto("/");
    const selector = page.getByRole("button", { name: "現在の対象を切り替え" });
    await selector.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "政治資金（政治団体）" })).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "調査研究費（議員室）" })).toBeVisible();
    const organization = dialog.getByRole("button", { name: /^サンプル党／/ }).first();
    const orgName = await organization.innerText();
    await organization.click();
    await expect(page).toHaveURL("/political-organizations");
    await expect(selector).toContainText(orgName.trim());
    await page.reload();
    await expect(selector).toContainText(orgName.trim());

    const otherTab = await context.newPage();
    await otherTab.goto("/politicians");
    const otherSelector = otherTab.getByRole("button", { name: "現在の対象を切り替え" });
    await expect(otherSelector).toContainText(orgName.trim());
    await selector.click();
    await expect(dialog.getByRole("button", { name: orgName.trim() })).toHaveAttribute("aria-pressed", "true");
    const researchGroup = dialog.locator("section").filter({ has: page.getByRole("heading", { name: "調査研究費（議員室）" }) });
    const bookOption = researchGroup.getByRole("button").first();
    const bookName = (await bookOption.innerText()).trim();
    await bookOption.click();
    await expect(page).toHaveURL(/\/politicians\/\d+\/books$/);
    await expect(selector).toContainText(bookName);
    await expect(otherSelector).toContainText(bookName);
    await expect(otherTab).toHaveURL(page.url());
    const sidebar = page.getByRole("complementary");
    await expect(sidebar.getByText("調査研究費", { exact: true })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "取引一覧" })).toHaveCount(0);
    for (const name of ["書類スキャン", "仕訳の確認・編集", "支給の登録", "公開", "支出群と成果", "読み取りプロンプト"]) {
      await expect(sidebar.getByRole("link", { name })).toHaveAttribute("href", /\/politicians\/\d+\/books\/\d+\//);
    }
    await expect(page.getByRole("main").getByText("現在の対象", { exact: true })).toBeVisible();
    await sidebar.getByRole("link", { name: "議員", exact: true }).click();
    await expect(page.getByRole("main").getByText(/^現在の対象：/)).toBeVisible();
    await page.reload();
    await expect(selector).toContainText(bookName);
    await selector.click();
    await expect(dialog.getByRole("button", { name: bookName })).toHaveAttribute("aria-pressed", "true");
    await dialog.getByRole("button", { name: orgName.trim() }).click();
    await expect(page).toHaveURL("/political-organizations");
    await expect(otherTab).toHaveURL("/political-organizations");
    await expect(sidebar.getByRole("link", { name: "取引一覧" })).toBeVisible();
    await otherTab.close();
  });

  test("政治団体モードからでも議員管理に進め、折りたたんだ状態でも対象を選択できる", async ({ page }) => {
    await page.goto("/");
    const sidebar = page.getByRole("complementary");
    await sidebar.getByRole("link", { name: "議員", exact: true }).click();
    await expect(page.getByRole("heading", { name: "議員一覧" })).toBeVisible();
    await sidebar.getByRole("button", { name: "サイドバーを折りたたむ" }).click();
    await sidebar.getByRole("button", { name: "現在の対象を切り替え" }).click();
    await page.getByRole("dialog").getByRole("link", { name: "議員一覧・年度帳簿の作成へ" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "議員一覧" })).toBeVisible();
  });
