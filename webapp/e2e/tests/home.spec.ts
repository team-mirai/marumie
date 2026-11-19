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
		await expect(page).toHaveTitle("まる見え政治資金｜チームみらい");
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
		await expect(card).toContainText(/収入総額\s*1,581万円/);
		await expect(card).toContainText(/支出総額\s*1,281万円/);
		await expect(card).toContainText(/現金残高\s*300万円/);
		await expect(
			card.locator('[role="group"][aria-label="政治資金の収支フロー図"]'),
		).toBeVisible();
		await expect(detail).toHaveAttribute("href", "/o/sample-party/2025");

		await detail.click();
		await expect(page).toHaveURL("/o/sample-party/2025");
	});

	test("政党のカードの丸は、政治団体と同じく代表者の写真（未登録なら人型のアイコン）でロゴは出さない", async ({
		page,
	}) => {
		await page.goto("/");
		const card = page
			.getByRole("region", { name: "政党の収支" })
			.getByRole("region", { name: "サンプル党の収支" });

		// シードの sample-party は顔写真が未登録なので人型のアイコンになる
		await expect(card.locator("svg[aria-hidden='true'] circle[r='5']").first()).toBeAttached();
		await expect(card.locator('img[src*="team-mirai-logo"]')).toHaveCount(0);
	});

	test("政治団体ごとのカードが出て、その年の政治団体ページへ移れる", async ({ page }) => {
		await page.goto("/");
		const card = page
			.getByRole("region", { name: "議員の政治団体" })
			.getByRole("region", { name: "E2Eテスト団体" });

		await expect(card.getByRole("heading", { name: "E2Eテスト団体" })).toBeVisible();
		await expect(card.getByText("収入総額")).toBeVisible();
		// シードの E2Eテスト団体には 2025 年の取引しか無いので、既定の 2026 年は図の代わりに準備中と出る
		await expect(card.getByText("2026年の収支の流れの図は準備中です")).toBeVisible();

		await card.getByRole("group", { name: "表示する年" }).getByRole("button", { name: "2025" }).click();
		await expect(card.getByRole("tab", { name: "詳細の区分" })).toBeVisible();
		await expect(
			card.getByRole("link", { name: "E2Eテスト団体の収支を詳しく", exact: true }),
		).toHaveAttribute("href", "/o/e2e-test-org/2025");
	});

	test("政党は政治団体の一覧に出ない", async ({ page }) => {
		await page.goto("/");

		await expect(
			page.getByRole("region", { name: "議員の政治団体" }).getByRole("region", { name: "サンプル党の収支" }),
		).toHaveCount(0);
	});

	test("カードの下に共通の下部ブロックと「データについて」のアンカーがある", async ({ page }) => {
		await page.goto("/");

		await expect(page.getByText("少しずつ進んでいますがまだまだです", { exact: false })).toBeVisible();
		await expect(page.getByText(/^新たに議員の調研費の公開を開始しました。/)).toContainText(
			"国民の皆さまとともに着実に歩んでまいります。詳しくはこちらのnote（別タブで開きます）をお読みください。",
		);
		const bandNote = page.getByRole("link", { name: /^こちらのnote\s*（別タブで開きます）$/ });
		await expect(bandNote).toHaveAttribute("href", "https://note.com/team_mirai_jp/n/na4db4abee5c8");
		await expect(bandNote).toHaveAttribute("target", "_blank");
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

		// シードで調研費を公開中の議員のうち、published の仕訳があるのはサンプル 太郎と美咲（次郎は準備中）。
		// 五十音順の先頭の太郎が最初に選ばれている
		const card = section.getByRole("button", { name: "サンプル 太郎の調研費を下に表示" });
		await expect(card).toHaveAttribute("aria-pressed", "true");
		await expect(
			section.getByRole("button", { name: "サンプル 美咲の調研費を下に表示" }),
		).toHaveAttribute("aria-pressed", "false");
		await expect(section.getByText("サンプル 次郎")).toHaveCount(0);

		const detail = section.getByRole("region", { name: "サンプル 太郎の調研費" });
		await expect(detail.getByRole("heading", { name: "サンプル 太郎の調研費" })).toBeVisible();
		await expect(detail.getByText("支給総額")).toBeVisible();
		await expect(detail.getByRole("tab", { name: "法律上の区分" })).toBeVisible();
		await detail.getByRole("link", { name: "サンプル 太郎の調研費を詳しく", exact: true }).click();
		await expect(page).toHaveURL("/p/sample-taro/2026");
	});

	test("SP では議員の調研費を3列の図で、政党のカードを全体表示の図で出す", async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto("/");
		const memberChart = page
			.getByRole("region", { name: "所属議員の調研費" })
			.locator('[role="group"][aria-label="サンプル 太郎の調査研究費の使いみちの流れ図"]')
			.locator("visible=true");
		const partyChart = page
			.getByRole("region", { name: "政党の収支" })
			.locator('[role="group"][aria-label="政治資金の収支フロー図"]')
			.first();

		// 議員の調研費は SP の低めの3列の図（幅 400 の座標）で、見出しは「支給」と右の列の位置の「支出」。
		// 政党のカードは PC と同じ図の背の高い版（幅 1200 の座標から左右の余白を詰めて切り出す）
		await expect(memberChart).toHaveAttribute("viewBox", /^0 0 400 /);
		await expect(memberChart.getByText("支給", { exact: true })).toBeVisible();
		await expect(memberChart.getByText("支出", { exact: true })).toBeVisible();
		await expect(partyChart).not.toHaveAttribute("viewBox", /^0 0 400 /);
		await expect(partyChart.getByText("合計", { exact: true })).toBeVisible();
	});

	test("SP では議員のカードをタップすると開閉する", async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto("/");
		const section = page.getByRole("region", { name: "所属議員の調研費" });
		const card = section.getByRole("button", { name: "サンプル 太郎の調研費", exact: true });
		const detailLink = section.getByRole("link", { name: "サンプル 太郎の調研費を詳しく", exact: true });

		await expect(card).toHaveAttribute("aria-expanded", "true");
		await expect(detailLink).toBeVisible();
		await expect(
			section.getByText("※年内に使わなかった未使用分は国庫に返還します。").locator("visible=true"),
		).toBeVisible();

		// 年が1つだけの議員の「2026年」は押せないラベルで、押してもカードは閉じない
		await section.getByText("2026年", { exact: true }).locator("visible=true").click();
		await expect(card).toHaveAttribute("aria-expanded", "true");

		await card.click();
		await expect(card).toHaveAttribute("aria-expanded", "false");
		await expect(detailLink).toHaveCount(0);

		await card.click();
		await expect(card).toHaveAttribute("aria-expanded", "true");
		await expect(detailLink).toHaveAttribute("href", "/p/sample-taro/2026");
	});

	test("SP では議員のカードを複数枚同時に開け、片方を閉じてももう片方は開いたまま", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto("/");
		const section = page.getByRole("region", { name: "所属議員の調研費" });
		const members = [
			{ name: "サンプル 太郎", slug: "sample-taro", granted: "700万円", spent: "220万円" },
			{ name: "サンプル 美咲", slug: "sample-misaki", granted: "500万円", spent: "60万円" },
		].map((member) => {
			const card = section.getByRole("button", { name: `${member.name}の調研費`, exact: true });
			return { ...member, card };
		});
		const panelOf = async (card: (typeof members)[number]["card"]) =>
			page.locator(`[id="${await card.getAttribute("aria-controls")}"]`);
		const expectOpenWithOwnNumbers = async (member: (typeof members)[number]) => {
			await expect(member.card).toHaveAttribute("aria-expanded", "true");
			const panel = await panelOf(member.card);
			await expect(panel).toContainText(new RegExp(`支給総額\\s*${member.granted}`));
			await expect(panel).toContainText(new RegExp(`支出総額\\s*${member.spent}`));
			await expect(
				panel.locator(
					`[role="group"][aria-label="${member.name}の調査研究費の使いみちの流れ図"]`,
				),
			).toBeVisible();
			await expect(
				panel.getByRole("link", { name: `${member.name}の調研費を詳しく`, exact: true }),
			).toHaveAttribute("href", `/p/${member.slug}/2026`);
		};
		const [taro, misaki] = members;

		// 最初は先頭の太郎だけが開いている
		await expectOpenWithOwnNumbers(taro);
		await expect(misaki.card).toHaveAttribute("aria-expanded", "false");

		// 美咲を開いても太郎は閉じず、2枚とも開いてそれぞれの数字と図が出る
		await misaki.card.click();
		await expectOpenWithOwnNumbers(misaki);
		await expectOpenWithOwnNumbers(taro);

		// 太郎を閉じても美咲は開いたまま
		await taro.card.click();
		await expect(taro.card).toHaveAttribute("aria-expanded", "false");
		await expect(
			section.getByRole("link", { name: "サンプル 太郎の調研費を詳しく", exact: true }),
		).toHaveCount(0);
		await expectOpenWithOwnNumbers(misaki);

		// 美咲を閉じて太郎を開き直しても同じ
		await misaki.card.click();
		await taro.card.click();
		await expect(misaki.card).toHaveAttribute("aria-expanded", "false");
		await expectOpenWithOwnNumbers(taro);
	});

	test("存在しない URL はトップページへ移る", async ({ page }) => {
		await page.goto("/no-such-page");

		await expect(page).toHaveURL("/");
	});
});
