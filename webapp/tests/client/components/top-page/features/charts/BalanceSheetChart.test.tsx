import { parse, type HTMLElement } from "node-html-parser";
import { renderToStaticMarkup } from "react-dom/server";
import BalanceSheetChart from "@/client/components/top-page/features/charts/BalanceSheetChart";

describe("BalanceSheetChart", () => {
  const markup = renderToStaticMarkup(
    <BalanceSheetChart
      data={{
        left: {
          currentAssets: 123_450_000,
          fixedAssets: 50_000,
          debtExcess: 0,
        },
        right: {
          currentLiabilities: 2_500_000,
          fixedLiabilities: 10_000,
          netAssets: 120_990_000,
        },
      }}
    />,
  );
  const document = parse(markup);

  const getRequiredElement = (selector: string) => {
    const element = document.querySelector(selector);

    expect(element).not.toBeNull();

    return element as HTMLElement;
  };

  const expectAccountAndAmount = (
    section: HTMLElement,
    accountName: string,
    amount: string,
  ) => {
    const item = section.children.find((child) =>
      child.textContent.replace(/\s+/g, "").includes(accountName),
    );

    expect(item).toBeDefined();
    expect(item?.textContent.replace(/\s+/g, "")).toContain(`${accountName}${amount}`);
  };

  it("貸借対照表の値を画像ロールで隠さず、意味のある図と区分として公開する", () => {
    expect(document.querySelector('[role="img"]')).toBeNull();

    const figure = getRequiredElement("figure");
    const figcaption = figure.querySelector("figcaption");

    expect(figcaption).not.toBeNull();
    expect(figcaption?.parentNode).toBe(figure);
    expect(figure.firstElementChild).toBe(figcaption);
    expect(figcaption?.textContent).toBe("貸借対照表");
    expect(figcaption?.classList.contains("sr-only")).toBe(true);
    expect(figure.querySelector('section[aria-label="資産"]')).not.toBeNull();
    expect(figure.querySelector('section[aria-label="負債・純資産"]')).not.toBeNull();
  });

  it("各区分内で勘定名と対応する金額を支援技術から参照できる", () => {
    const assets = getRequiredElement('section[aria-label="資産"]');
    const liabilitiesAndNetAssets = getRequiredElement(
      'section[aria-label="負債・純資産"]',
    );

    expectAccountAndAmount(assets, "流動資産", "1億2,345万円");
    expectAccountAndAmount(assets, "固定資産", "5万円");
    expectAccountAndAmount(liabilitiesAndNetAssets, "流動負債", "250万円");
    expectAccountAndAmount(liabilitiesAndNetAssets, "固定負債", "1万円");
    expectAccountAndAmount(liabilitiesAndNetAssets, "純資産", "1億2,099万円");
  });
});
