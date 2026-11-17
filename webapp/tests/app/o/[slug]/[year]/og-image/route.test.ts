jest.mock("@/server/contexts/public-finance/presentation/loaders/load-organization-og-image-data", () => ({
  loadOrganizationOgImageData: jest.fn(),
}));
jest.mock("@/app/_og-image/render-finance-og-image", () => ({
  ...jest.requireActual("@/app/_og-image/render-finance-og-image"),
  renderFinanceOgImage: jest.fn(),
}));

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GET } from "@/app/o/[slug]/[year]/og-image/route";
import { loadOrganizationOgImageData } from "@/server/contexts/public-finance/presentation/loaders/load-organization-og-image-data";
import { renderFinanceOgImage } from "@/app/_og-image/render-finance-og-image";

const loadMock = loadOrganizationOgImageData as jest.Mock;
const renderMock = renderFinanceOgImage as jest.Mock;

const topImage = readFileSync(join(process.cwd(), "public/social/og-top.png"));
const generated = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
const friendly = { nodes: [], links: [] };

const get = (slug: string, year: string) =>
  GET(new Request(`http://localhost/o/${slug}/${year}/og-image`), {
    params: Promise.resolve({ slug, year }),
  });

const bytes = async (response: Response) => Buffer.from(await response.arrayBuffer());

describe("GET /o/[slug]/[year]/og-image", () => {
  beforeEach(() => {
    loadMock.mockReset();
    renderMock.mockReset();
    renderMock.mockResolvedValue(
      new Response(generated, { status: 200, headers: { "Content-Type": "image/png" } }),
    );
  });

  it("政党ページは、ロゴ付きの見出しと「〜の収支」で、その団体・その年の画像を返す", async () => {
    loadMock.mockResolvedValue({ displayName: "チームみらい", friendly, photo: null });

    const response = await get("team-mirai", "2025");

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(await bytes(response)).toEqual(Buffer.from(generated));
    expect(loadMock).toHaveBeenCalledWith("team-mirai", 2025, { withPhoto: false });
    expect(renderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "o/team-mirai/2025",
        variant: "party",
        face: { kind: "logo" },
        title: "チームみらいの収支",
        sankey: friendly,
      }),
    );
  });

  it("政治団体ページは、代表者の顔写真と団体名の見出しにする", async () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    loadMock.mockResolvedValue({ displayName: "安野貴博の政治団体", friendly, photo: jpeg });

    await get("anno", "2026");

    expect(renderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "group",
        face: { kind: "photo", src: expect.stringMatching(/^data:image\/jpeg;base64,/) },
        title: "安野貴博の政治団体",
      }),
    );
  });

  it("写真が無ければ人型にする", async () => {
    loadMock.mockResolvedValue({ displayName: "安野貴博の政治団体", friendly, photo: null });

    await get("anno", "2026");

    expect(renderMock).toHaveBeenCalledWith(expect.objectContaining({ face: { kind: "person" } }));
  });

  it("データが無い団体・年では、トップの画像を返す", async () => {
    loadMock.mockResolvedValue(null);

    const response = await get("unknown", "2026");

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(await bytes(response)).toEqual(topImage);
    expect(renderMock).not.toHaveBeenCalled();
  });

  it("対象外の年では、データを読まずにトップの画像を返す", async () => {
    const response = await get("team-mirai", "1999");

    expect(await bytes(response)).toEqual(topImage);
    expect(loadMock).not.toHaveBeenCalled();
  });

  it("図に描くものが無いときもトップの画像を返す", async () => {
    loadMock.mockResolvedValue({ displayName: "チームみらい", friendly, photo: null });
    renderMock.mockResolvedValue(null);

    expect(await bytes(await get("team-mirai", "2026"))).toEqual(topImage);
  });

  it("生成に失敗しても、エラーではなくトップの画像を返す", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    loadMock.mockResolvedValue({ displayName: "チームみらい", friendly, photo: null });
    renderMock.mockRejectedValue(new Error("fonts unavailable"));

    const response = await get("team-mirai", "2026");

    expect(response.status).toBe(200);
    expect(await bytes(response)).toEqual(topImage);
  });
});
