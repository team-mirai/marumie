import { parse } from "node-html-parser";
import { renderToStaticMarkup } from "react-dom/server";
import CashFlowSection from "@/client/components/top-page/CashFlowSection";
import type { SankeyData } from "@/types/sankey";

const DATA: SankeyData = {
  nodes: [
    { id: "i-grant", label: "政党交付金", nodeType: "income" },
    { id: "t", label: "合計", nodeType: "total" },
    { id: "e-act", label: "政治活動費", nodeType: "expense" },
  ],
  links: [
    { source: "i-grant", target: "t", value: 1_000_000 },
    { source: "t", target: "e-act", value: 1_000_000 },
  ],
};

function render(element: React.ReactElement) {
  // styled-jsx の <style jsx> は jest では変換されず、属性の警告が出るので黙らせる
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  const html = renderToStaticMarkup(element);
  consoleError.mockRestore();
  return parse(html);
}

describe("CashFlowSection", () => {
  it("既定では最初の図を描き出しの動きで出す（描き出し前の形で描く）", () => {
    const document = render(<CashFlowSection friendly={DATA} political={DATA} />);
    expect(document.querySelector(".sankey-chart")?.classList.contains("is-in")).toBe(false);
  });

  it("initialDrawIn を false にすると最初の図を描き終えた形で出す", () => {
    const document = render(
      <CashFlowSection friendly={DATA} political={DATA} initialDrawIn={false} />,
    );
    expect(document.querySelector(".sankey-chart")?.classList.contains("is-in")).toBe(true);
  });
});
