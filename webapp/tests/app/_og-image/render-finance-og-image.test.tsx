jest.mock("next/og", () => ({
  ImageResponse: jest.fn().mockImplementation(() => ({
    arrayBuffer: async () => new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer,
  })),
}));
jest.mock("@/app/_og-image/og-fonts", () => ({
  ...jest.requireActual("@/app/_og-image/og-fonts"),
  loadOgFonts: jest.fn().mockResolvedValue([]),
}));

import { ImageResponse } from "next/og";
import {
  ogPhotoDataUri,
  renderFinanceOgImage,
  splitOgTitle,
} from "@/app/_og-image/render-finance-og-image";
import type { SankeyData } from "@/types/sankey";

const data: SankeyData = {
  nodes: [
    { id: "t", label: "合計", nodeType: "total" },
    { id: "i1", label: "寄附", nodeType: "income" },
    { id: "e1", label: "政治活動費", nodeType: "expense" },
  ],
  links: [
    { source: "i1", target: "t", value: 1_000_000 },
    { source: "t", target: "e1", value: 600_000 },
  ],
};

const input = {
  key: "o/team-mirai/2026",
  variant: "party" as const,
  face: { kind: "logo" as const },
  title: "チームみらいの収支",
  sankey: data,
};

describe("splitOgTitle", () => {
  it("最後の「の」から後ろを小さく描く部分に分ける", () => {
    expect(splitOgTitle("チームみらいの収支")).toEqual({ name: "チームみらい", suffix: "の収支" });
    expect(splitOgTitle("安野貴博の政治団体")).toEqual({ name: "安野貴博", suffix: "の政治団体" });
    expect(splitOgTitle("デジタル民主主義")).toEqual({ name: "デジタル民主主義", suffix: "" });
  });
});

describe("ogPhotoDataUri", () => {
  it("PNG・JPEG は data URI にし、画像の生成で描けない WebP などは null にする", () => {
    expect(ogPhotoDataUri(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0]))).toMatch(/^data:image\/png;base64,/);
    expect(ogPhotoDataUri(new Uint8Array([0xff, 0xd8, 0xff, 0]))).toMatch(/^data:image\/jpeg;base64,/);
    expect(ogPhotoDataUri(new TextEncoder().encode("RIFF....WEBP"))).toBeNull();
  });
});

describe("renderFinanceOgImage", () => {
  it("1200×630 の PNG を 200 で返す", async () => {
    const response = await renderFinanceOgImage(input);

    expect(response?.status).toBe(200);
    expect(response?.headers.get("Content-Type")).toBe("image/png");
    expect(ImageResponse).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ width: 1200, height: 630 }),
    );
  });

  it("議員の調研費は、見出しの総額を「支給」「支出」にし、渡した総額を使う", async () => {
    (ImageResponse as unknown as jest.Mock).mockClear();
    const response = await renderFinanceOgImage({
      key: "p/sample-taro/2026",
      variant: "member",
      face: { kind: "person" },
      title: "サンプル太郎の調研費",
      sankey: data,
      totals: { in: 6_750_000, out: 3_260_000 },
    });

    expect(response?.status).toBe(200);
    const card = (ImageResponse as unknown as jest.Mock).mock.calls[0][0];
    expect(card.props.totals).toEqual([
      expect.objectContaining({ label: "支給", yen: 6_750_000 }),
      expect.objectContaining({ label: "支出", yen: 3_260_000 }),
    ]);
    expect(card.props.name).toBe("サンプル太郎");
    expect(card.props.suffix).toBe("の調研費");
  });

  it("図に描くものが無ければ null を返す（呼び出し側でトップの画像にする）", async () => {
    expect(await renderFinanceOgImage({ ...input, sankey: { nodes: [], links: [] } })).toBeNull();
  });
});
