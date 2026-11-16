import { test, expect } from "@playwright/test";

const ORG_URL = "/o/sample-party/2026";
const POLITICIAN_URL = "/p/sample-taro/2026";

test.describe("ヘッダー（PC）", () => {
	test.use({ viewport: { width: 1280, height: 800 } });

	test("5項目のナビが並び、組織・年度セレクタは無い", async ({ page }) => {
		await page.goto(ORG_URL);

		const nav = page.getByRole("navigation", { name: "メインナビゲーション" });
		await expect(nav.getByRole("button", { name: "政党・政治団体" })).toBeVisible();
		await expect(nav.getByRole("button", { name: "調研費" })).toBeVisible();
		await expect(
			nav.getByRole("link", { name: "まる見え政治資金とは" }),
		).toHaveAttribute("href", "/about");
		const faq = nav.getByRole("link", { name: /よくあるご質問/ });
		await expect(faq).toHaveAttribute("target", "_blank");
		await expect(faq).toHaveAttribute("href", /notion\.site/);
		await expect(nav.getByRole("link", { name: "データについて" })).toHaveAttribute(
			"href",
			"/#explanation",
		);

		await expect(page.getByText("表示する団体名", { exact: true })).toHaveCount(0);
	});

	test("表示中のページに当たる項目に下線が付く", async ({ page }) => {
		const nav = page.getByRole("navigation", { name: "メインナビゲーション" });

		await page.goto(ORG_URL);
		await expect(nav.getByRole("button", { name: "政党・政治団体" })).toHaveAttribute(
			"aria-current",
			"page",
		);
		await expect(nav.getByRole("button", { name: "調研費" })).not.toHaveAttribute(
			"aria-current",
			"page",
		);

		await page.goto(POLITICIAN_URL);
		await expect(nav.getByRole("button", { name: "調研費" })).toHaveAttribute(
			"aria-current",
			"page",
		);

		await page.goto("/about");
		await expect(
			nav.getByRole("link", { name: "まる見え政治資金とは" }),
		).toHaveAttribute("aria-current", "page");
	});

	test("「政党・政治団体」のメガメニューから団体の年のページへ移れる", async ({ page }) => {
		await page.goto(ORG_URL);

		const trigger = page
			.getByRole("navigation", { name: "メインナビゲーション" })
			.getByRole("button", { name: "政党・政治団体" });
		await expect(trigger).toHaveAttribute("aria-expanded", "false");
		await trigger.click();
		await expect(trigger).toHaveAttribute("aria-expanded", "true");

		const menu = page.locator("#header-mega-menu");
		await expect(
			menu.getByText("政治資金｜政党・政治団体が集めて使うお金"),
		).toHaveCount(0);
		// 表示中の団体に「表示中」が付き、その年が選ばれている
		await expect(
			menu.getByRole("link", { name: /サンプル党/ }).getByText("表示中"),
		).toBeVisible();
		await expect(
			menu
				.getByRole("navigation", { name: "サンプル党の表示する年" })
				.getByRole("link", { name: "2026年" }),
		).toHaveAttribute("aria-current", "page");

		await menu
			.getByRole("navigation", { name: "E2Eテスト団体の表示する年" })
			.getByRole("link", { name: "2025年" })
			.click();
		await expect(page).toHaveURL("/o/e2e-test-org/2025");
		await expect(page.locator("#header-mega-menu")).toHaveCount(0);
	});

	test("「調研費」のメガメニューには公開中の議員だけが出て、議員のページへ移れる", async ({
		page,
	}) => {
		await page.goto(ORG_URL);

		await page
			.getByRole("navigation", { name: "メインナビゲーション" })
			.getByRole("button", { name: "調研費" })
			.click();

		const menu = page.locator("#header-mega-menu");
		await expect(
			menu.getByText("所属議員の調研費｜毎月支給される公費を何に使ったか"),
		).toBeVisible();
		// 公開済みの仕訳があるサンプル 太郎・美咲が出る。花子・次郎は帳簿はあるが公開済みの仕訳が無いので出ない
		await expect(menu.getByRole("link", { name: /サンプル 美咲/ })).toBeVisible();
		await expect(menu.getByText(/サンプル 花子/)).toHaveCount(0);
		await expect(menu.getByText(/サンプル 次郎/)).toHaveCount(0);

		// 公開している年が1つだけの議員には年の切り替えが出ず、名前から最新の年のページへ移る
		await expect(
			menu.getByRole("navigation", { name: "サンプル 太郎の調研費の表示する年" }),
		).toHaveCount(0);
		await menu.getByRole("link", { name: /サンプル 太郎/ }).click();
		await expect(page).toHaveURL(/\/p\/sample-taro\/2026$/);
	});

	test("メガメニューは Esc と外側のクリックで閉じ、キーボードで開ける", async ({ page }) => {
		await page.goto(ORG_URL);

		const trigger = page
			.getByRole("navigation", { name: "メインナビゲーション" })
			.getByRole("button", { name: "政党・政治団体" });
		await trigger.focus();
		await page.keyboard.press("Enter");
		await expect(page.locator("#header-mega-menu")).toBeVisible();

		await page.keyboard.press("Escape");
		await expect(page.locator("#header-mega-menu")).toHaveCount(0);
		await expect(trigger).toBeFocused();
		await expect(trigger).toHaveAttribute("aria-expanded", "false");

		await trigger.click();
		await expect(page.locator("#header-mega-menu")).toBeVisible();
		await page.mouse.click(640, 700);
		await expect(page.locator("#header-mega-menu")).toHaveCount(0);
	});
});

test.describe("ヘッダー（SP）", () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test("メニューボタンで v9 のフラットリストを開き、議員を顔写真から選べる", async ({ page }) => {
		await page.goto(ORG_URL);

		await expect(
			page.getByRole("navigation", { name: "メインナビゲーション" }),
		).toBeHidden();

		const menuButton = page.getByRole("button", { name: "メニュー", exact: true });
		await expect(menuButton).toHaveAttribute("aria-expanded", "false");
		await menuButton.click();

		const closeButton = page.getByRole("button", { name: "メニューを閉じる" });
		await expect(closeButton).toHaveAttribute("aria-expanded", "true");

		const menu = page.locator("#header-sp-menu");
		await expect(menu.getByRole("link", { name: "サンプル党の収支" })).toBeVisible();
		await expect(menu.getByRole("link", { name: "まる見え政治資金とは" })).toBeVisible();
		await expect(menu.getByRole("link", { name: "データについて" })).toBeVisible();
		await expect(menu.getByRole("link", { name: /よくあるご質問/ })).toBeVisible();
		await expect(menu.getByRole("link", { name: /調研費についてのご意見/ })).toBeVisible();
		await expect(menu.getByText("寄附で応援する")).toHaveCount(0);
		await expect(menu.getByText("党員になる")).toHaveCount(0);
		await expect(menu.getByText(/サンプル 花子/)).toHaveCount(0);

		// 開いている間は後ろのページをスクロールさせない
		await expect
			.poll(() => page.evaluate(() => document.documentElement.style.overflow))
			.toBe("hidden");

		await menu.getByRole("link", { name: /サンプル 太郎/ }).click();
		await expect(page).toHaveURL(/\/p\/sample-taro\/2026$/);
		await expect(page.locator("#header-sp-menu")).toHaveCount(0);
		await expect
			.poll(() => page.evaluate(() => document.documentElement.style.overflow))
			.toBe("");
	});

	test("メニューは閉じるボタンと Esc で閉じ、Esc ではメニューボタンにフォーカスが戻る", async ({
		page,
	}) => {
		await page.goto(ORG_URL);

		await page.getByRole("button", { name: "メニュー", exact: true }).click();
		await expect(page.locator("#header-sp-menu")).toBeVisible();

		await page.getByRole("button", { name: "メニューを閉じる" }).click();
		await expect(page.locator("#header-sp-menu")).toHaveCount(0);
		await expect(page.getByRole("button", { name: "メニュー", exact: true })).toHaveAttribute(
			"aria-expanded",
			"false",
		);

		await page.getByRole("button", { name: "メニュー", exact: true }).click();
		await expect(page.locator("#header-sp-menu")).toBeVisible();
		await page.keyboard.press("Escape");
		await expect(page.locator("#header-sp-menu")).toHaveCount(0);
		const reopenButton = page.getByRole("button", { name: "メニュー", exact: true });
		await expect(reopenButton).toBeFocused();
		await expect
			.poll(() => page.evaluate(() => document.documentElement.style.overflow))
			.toBe("");
	});

	test("開いている間は Tab のフォーカスがメニューの中で循環し、後ろのページへ移らない", async ({
		page,
	}) => {
		await page.goto(ORG_URL);

		await page.getByRole("button", { name: "メニュー", exact: true }).click();
		const menu = page.locator("#header-sp-menu");
		const lastLink = menu.getByRole("link", { name: /調研費についてのご意見/ });
		await expect(lastLink).toBeVisible();

		await lastLink.focus();
		await page.keyboard.press("Tab");
		const isFocusInHeader = () =>
			page.evaluate(() => document.querySelector("header")?.contains(document.activeElement));
		await expect.poll(isFocusInHeader).toBe(true);

		await page.keyboard.press("Shift+Tab");
		await expect(lastLink).toBeFocused();
	});

	test.describe("動きを減らす設定", () => {
		test.use({ reducedMotion: "reduce" });

		test("閉じるボタンですぐに閉じる", async ({ page }) => {
			await page.goto(ORG_URL);

			await page.getByRole("button", { name: "メニュー", exact: true }).click();
			await expect(page.locator("#header-sp-menu")).toBeVisible();
			// 閉じる動きの間に付く data-sp-menu="closing" が一度も付かない（動きを見せずに閉じる）ことを記録する
			await page.evaluate(() => {
				const header = document.querySelector("header");
				const states: (string | null)[] = [];
				(window as unknown as { spMenuStates: typeof states }).spMenuStates = states;
				if (!header) return;
				new MutationObserver(() => states.push(header.getAttribute("data-sp-menu"))).observe(
					header,
					{ attributes: true, attributeFilter: ["data-sp-menu"] },
				);
			});
			await page.getByRole("button", { name: "メニューを閉じる" }).click();
			await expect(page.locator("#header-sp-menu")).toHaveCount(0);
			const states = await page.evaluate(
				() => (window as unknown as { spMenuStates: (string | null)[] }).spMenuStates,
			);
			expect(states).not.toContain("closing");
		});
	});
});
