import { renderToStaticMarkup } from "react-dom/server";
import AmountSummary from "@/client/components/common/AmountSummary";
import AccessibleFormattedAmount from "@/client/components/top-page/features/financial-summary/AccessibleFormattedAmount";
import type { FormattedAmount } from "@/client/lib/financial-calculator";

describe("AccessibleFormattedAmount", () => {
  const testCases: Array<{
    description: string;
    amount: FormattedAmount;
    accessibleText: string;
  }> = [
    {
      description: "億と万円を含む金額",
      amount: { main: "5", secondary: "億", tertiary: "3210", unit: "万円" },
      accessibleText: "5億3210万円",
    },
    {
      description: "億円ちょうどの金額",
      amount: { main: "1", secondary: "億", tertiary: "", unit: "円" },
      accessibleText: "1億円",
    },
    {
      description: "万円単位の金額",
      amount: { main: "970", secondary: "", tertiary: "", unit: "万円" },
      accessibleText: "970万円",
    },
    {
      description: "負の金額",
      amount: { main: "-1", secondary: "億", tertiary: "5000", unit: "万円" },
      accessibleText: "-1億5000万円",
    },
  ];

  it.each(testCases)(
    "$descriptionを単一の読み上げ用文字列として描画する",
    ({ amount, accessibleText }) => {
      const markup = renderToStaticMarkup(
        <AccessibleFormattedAmount amount={amount} visualClassName="visual-amount">
          <span>{amount.main}</span>
          <span>{amount.secondary}</span>
          <span>{amount.tertiary}</span>
          <span>{amount.unit}</span>
        </AccessibleFormattedAmount>,
      );

      expect(markup).toContain(`<span class="sr-only">${accessibleText}</span>`);
      expect(markup).toContain('<span aria-hidden="true" class="visual-amount">');
      expect(markup.match(/aria-hidden=/g)).toHaveLength(1);
    },
  );

  it("見出しカードの金額欄で可視表示を隠し、連結した金額だけを読み上げ対象にする", () => {
    const markup = renderToStaticMarkup(
      <AmountSummary items={[{ label: "収入総額", color: "#000000", amount: 532_100_000 }]} />,
    );

    expect(markup).toContain('<span class="sr-only">5億3210万円</span>');
    expect(markup).toContain('<span aria-hidden="true" class="flex items-baseline');
    expect(markup.match(/aria-hidden=/g)).toHaveLength(2); // 金額と、ラベルの色の印
  });
});
