import { test, expect } from "@playwright/test";

test.describe("トップページ", () => {
	test("ルートにアクセスするとリダイレクトされずにトップページが表示される", async ({
		page,
	}) => {
		const errors: string[] = [];
		page.on("pageerror", (error) => {
			errors.push(`${error.name}: ${error.message}`);
		});

		const response = await page.goto("/");

		expect(response?.status()).toBe(200);
		await expect(page).toHaveURL("/");
		await expect(page).toHaveTitle(/みらい まる見え政治資金/);
		await expect(
			page.getByRole("region", { name: "政党の収支" }).getByRole("heading", { name: "サンプル党の収支" }),
		).toBeVisible();
		expect(errors, `以下のエラーが発生しました:\n${errors.join("\n")}`).toHaveLength(0);
	});

	test("政党のカードで年を切り替えると金額と「詳しく」の飛び先が変わる", async ({ page }) => {
		await page.goto("/");
		const card = page
			.getByRole("region", { name: "政党の収支" })
			.getByRole("region", { name: "サンプル党の収支" });
		const years = card.getByRole("group", { name: "表示する年" });
		const detail = card.getByRole("link", { name: "サンプル党の収支を詳しく", exact: true });

		await expect(years.getByRole("button", { name: "2026" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		await expect(detail).toHaveAttribute("href", "/o/sample-party/2026");

		// シードの sample-party の取引はすべて 2025 年度にある
		await years.getByRole("button", { name: "2025" }).click();

		await expect(years.getByRole("button", { name: "2025" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		await expect(card).toContainText(/収入総額\s*1581万円/);
		await expect(card).toContainText(/支出総額\s*1281万円/);
		await expect(card).toContainText(/収支・現金残高\s*300万円/);
		await expect(
			card.locator('[role="group"][aria-label="政治資金の収支フロー図"]'),
		).toBeVisible();
		await expect(detail).toHaveAttribute("href", "/o/sample-party/2025");

		await detail.click();
		await expect(page).toHaveURL("/o/sample-party/2025");
	});

	test("政治団体ごとのカードが出て、その年の政治団体ページへ移れる", async ({ page }) => {
		await page.goto("/");
		const card = page
			.getByRole("region", { name: "政治団体の収支" })
			.getByRole("region", { name: "E2Eテスト団体" });

		await expect(card.getByRole("heading", { name: "E2Eテスト団体" })).toBeVisible();
		await expect(card.getByText("収入総額")).toBeVisible();
		await expect(card.getByRole("tab", { name: "詳細の区分" })).toBeVisible();

		await card.getByRole("group", { name: "表示する年" }).getByRole("button", { name: "2025" }).click();
		await expect(
			card.getByRole("link", { name: "E2Eテスト団体の収支を詳しく", exact: true }),
		).toHaveAttribute("href", "/o/e2e-test-org/2025");
	});

	test("政党は政治団体の一覧に出ない", async ({ page }) => {
		await page.goto("/");

		await expect(
			page.getByRole("region", { name: "政治団体の収支" }).getByRole("region", { name: "サンプル党の収支" }),
		).toHaveCount(0);
	});

	test("カードの下に共通の下部ブロックと「データについて」のアンカーがある", async ({ page }) => {
		await page.goto("/");

		await expect(page.getByText("少しずつ進んでいますがまだまだです", { exact: false })).toBeVisible();
		await expect(page.locator("#explanation")).toBeVisible();
		await expect(page.getByRole("region", { name: "データについて" })).toContainText("免責事項");
	});

	test("所属議員の調研費に公開中の議員だけがカードで並び、選んだ議員の調研費が出る", async ({
		page,
	}) => {
		await page.goto("/");
		const section = page.getByRole("region", { name: "所属議員の調研費" });

		await expect(section.getByText("議員に毎月100万円支給される公費を何に使ったか")).toBeVisible();
		await expect(
			section.getByRole("link", { name: /チームみらいの調研費の使用方針/ }),
		).toHaveAttribute("target", "_blank");

		// シードの sample-party の所属議員のうち、published の仕訳があるのはサンプル 太郎だけ（次郎は準備中）
		const card = section.getByRole("button", { name: "サンプル 太郎の調研費を下に表示" });
		await expect(card).toHaveAttribute("aria-pressed", "true");
		await expect(section.getByText("サンプル 次郎")).toHaveCount(0);

		const detail = section.getByRole("region", { name: "サンプル 太郎の調研費" });
		await expect(detail.getByRole("heading", { name: "サンプル 太郎の調研費" })).toBeVisible();
		await expect(detail.getByText("支給総額")).toBeVisible();
		await expect(detail.getByRole("tab", { name: "法律上の区分" })).toBeVisible();
		await detail.getByRole("link", { name: "サンプル 太郎の調研費を詳しく" }).click();
		await expect(page).toHaveURL("/p/sample-taro/2026");
	});

	test("SP では議員の調研費を3列の図で、政党のカードを全体表示の図で出す", async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto("/");
		const memberChart = page
			.getByRole("region", { name: "所属議員の調研費" })
			.locator('[role="group"][aria-label="サンプル 太郎の調査研究費の使いみちの流れ図"]');
		const partyChart = page
			.getByRole("region", { name: "政党の収支" })
			.locator('[role="group"][aria-label="政治資金の収支フロー図"]')
			.first();

		// 議員の調研費は SP の3列の図（幅 400 の座標）、政党のカードは PC と同じ図の背の高い版（幅 1200）
		await expect(memberChart).toHaveAttribute("viewBox", /^0 0 400 /);
		await expect(memberChart.getByText("支出・未使用", { exact: true })).toBeVisible();
		await expect(partyChart).toHaveAttribute("viewBox", /^0 0 1200 /);
	});

	test("SP では議員のカードをタップすると開閉する", async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto("/");
		const section = page.getByRole("region", { name: "所属議員の調研費" });
		const card = section.getByRole("button", { name: "サンプル 太郎の調研費", exact: true });
		const detailLink = section.getByRole("link", { name: "サンプル 太郎の調研費を詳しく" });

		await expect(card).toHaveAttribute("aria-expanded", "true");
		await expect(detailLink).toBeVisible();

		await card.click();
		await expect(card).toHaveAttribute("aria-expanded", "false");
		await expect(detailLink).toHaveCount(0);

		await card.click();
		await expect(card).toHaveAttribute("aria-expanded", "true");
		await expect(detailLink).toHaveAttribute("href", "/p/sample-taro/2026");
	});

	test("存在しない URL はトップページへ移る", async ({ page }) => {
		await page.goto("/no-such-page");

		await expect(page).toHaveURL("/");
	});
});
