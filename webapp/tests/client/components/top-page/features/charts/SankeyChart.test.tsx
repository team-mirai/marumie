import { parse } from "node-html-parser";
import { renderToStaticMarkup } from "react-dom/server";
import SankeyChart from "@/client/components/top-page/features/charts/SankeyChart";
import type { SankeyData } from "@/types/sankey";

const DATA: SankeyData = {
  nodes: [
    { id: "i-grant", label: "政党交付金", nodeType: "income" },
    { id: "t", label: "合計", nodeType: "total" },
    { id: "e-act", label: "政治活動費", nodeType: "expense" },
    { id: "e-cash", label: "現金残高", nodeType: "expense" },
  ],
  links: [
    { source: "i-grant", target: "t", value: 1_000_000 },
    { source: "t", target: "e-act", value: 600_000 },
    { source: "t", target: "e-cash", value: 400_000 },
  ],
};

describe("SankeyChart", () => {
  // styled-jsx の <style jsx> は jest では変換されず、属性の警告が出るので黙らせる
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  const document = parse(renderToStaticMarkup(<SankeyChart data={DATA} />));
  consoleError.mockRestore();
  const svg = document.querySelector("svg");

  it("ラベルの書体はデザインと同じくヒラギノを先に使い、無い環境では Noto Sans JP にする", () => {
    const style = svg?.getAttribute("style") ?? "";
    const hiragino = style.indexOf("Hiragino Kaku Gothic ProN");
    const noto = style.indexOf("var(--font-noto-sans-jp)");
    expect(hiragino).toBeGreaterThanOrEqual(0);
    expect(noto).toBeGreaterThan(hiragino);
  });

  it("項目名は 800、金額は 600 の太さで描く", () => {
    const spans = document.querySelectorAll(".lbl tspan");
    const name = spans.find((span) => span.text === "政党交付金");
    const amount = spans.find((span) => span.text.startsWith("100万円"));
    expect(name?.getAttribute("font-weight")).toBe("800");
    expect(amount?.getAttribute("font-weight")).toBe("600");
  });
});
