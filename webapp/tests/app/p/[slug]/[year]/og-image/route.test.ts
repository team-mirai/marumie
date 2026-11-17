jest.mock("@/server/contexts/research-fund/presentation/loaders/load-research-fund-og-image-data", () => ({
  loadResearchFundOgImageData: jest.fn(),
}));
jest.mock("@/app/_og-image/render-finance-og-image", () => ({
  ...jest.requireActual("@/app/_og-image/render-finance-og-image"),
  renderFinanceOgImage: jest.fn(),
}));

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GET } from "@/app/p/[slug]/[year]/og-image/route";
import { loadResearchFundOgImageData } from "@/server/contexts/research-fund/presentation/loaders/load-research-fund-og-image-data";
import { renderFinanceOgImage } from "@/app/_og-image/render-finance-og-image";

const loadMock = loadResearchFundOgImageData as jest.Mock;
const renderMock = renderFinanceOgImage as jest.Mock;

const topImage = readFileSync(join(process.cwd(), "public/social/og-top.png"));
const generated = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
const sankey = { nodes: [], links: [] };
const data = (photo: Uint8Array | null = null) => ({
  slug: "mineshima-yuya",
  name: "峰島侑也",
  sankey,
  totals: { in: 6_750_000, out: 3_260_000 },
  photo,
});

const get = (slug: string, year: string) =>
  GET(new Request(`http://localhost/p/${slug}/${year}/og-image`), {
    params: Promise.resolve({ slug, year }),
  });

const bytes = async (response: Response) => Buffer.from(await response.arrayBuffer());

describe("GET /p/[slug]/[year]/og-image", () => {
  beforeEach(() => {
    loadMock.mockReset();
    renderMock.mockReset();
    renderMock.mockResolvedValue(
      new Response(generated, { status: 200, headers: { "Content-Type": "image/png" } }),
    );
  });

  it("その議員・その年の調研費の画像を、顔写真と「〜の調研費」の見出し・支給と支出の総額で返す", async () => {
    loadMock.mockResolvedValue(data(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])));

    const response = await get("mineshima-yuya", "2026");

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(await bytes(response)).toEqual(Buffer.from(generated));
    expect(loadMock).toHaveBeenCalledWith("mineshima-yuya", 2026);
    expect(renderMock).toHaveBeenCalledWith({
      key: "p/mineshima-yuya/2026",
      variant: "member",
      face: { kind: "photo", src: expect.stringMatching(/^data:image\/jpeg;base64,/) },
      title: "峰島侑也の調研費",
      sankey,
      totals: { in: 6_750_000, out: 3_260_000 },
    });
  });

  it("写真が無ければ人型にする", async () => {
    loadMock.mockResolvedValue(data());

    await get("mineshima-yuya", "2026");

    expect(renderMock).toHaveBeenCalledWith(expect.objectContaining({ face: { kind: "person" } }));
  });

  it("プレビュー URL の slug の区間は、そのままページと同じ条件で引く", async () => {
    loadMock.mockResolvedValue(data());

    await get("mineshima-yuya~abc", "2026");

    expect(loadMock).toHaveBeenCalledWith("mineshima-yuya~abc", 2026);
    // 模様はプレビュー用の文字列によらず議員ごとに決める
    expect(renderMock).toHaveBeenCalledWith(
      expect.objectContaining({ key: "p/mineshima-yuya/2026" }),
    );
  });

  it("ページが見つからない（公開していない議員を公開 URL で開いた場合を含む）ときは、トップの画像を返す", async () => {
    loadMock.mockResolvedValue(null);

    const response = await get("hidden", "2026");

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(await bytes(response)).toEqual(topImage);
    expect(renderMock).not.toHaveBeenCalled();
  });

  it("年度が数字でなければ、データを読まずにトップの画像を返す", async () => {
    expect(await bytes(await get("mineshima-yuya", "abc"))).toEqual(topImage);
    expect(loadMock).not.toHaveBeenCalled();
  });

  it("調研費のデータが無く図に描くものが無いときもトップの画像を返す", async () => {
    loadMock.mockResolvedValue(data());
    renderMock.mockResolvedValue(null);

    expect(await bytes(await get("mineshima-yuya", "2026"))).toEqual(topImage);
  });

  it("生成に失敗しても、エラーではなくトップの画像を返す", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    loadMock.mockResolvedValue(data());
    renderMock.mockRejectedValue(new Error("fonts unavailable"));

    const response = await get("mineshima-yuya", "2026");

    expect(response.status).toBe(200);
    expect(await bytes(response)).toEqual(topImage);
  });
});
