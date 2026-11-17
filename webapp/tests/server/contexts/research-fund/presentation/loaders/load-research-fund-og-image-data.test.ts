jest.mock("@/server/contexts/research-fund/presentation/loaders/load-research-fund-page", () => ({
  loadResearchFundPage: jest.fn(),
}));
jest.mock("@/server/contexts/research-fund/presentation/loaders/load-politician-photo-url", () => ({
  loadPoliticianPhotoUrl: jest.fn(),
}));

import { loadPoliticianPhotoUrl } from "@/server/contexts/research-fund/presentation/loaders/load-politician-photo-url";
import { loadResearchFundOgImageData } from "@/server/contexts/research-fund/presentation/loaders/load-research-fund-og-image-data";
import { loadResearchFundPage } from "@/server/contexts/research-fund/presentation/loaders/load-research-fund-page";
import { deriveResearchFundPreviewToken } from "@/shared/research-fund/preview-token";

const loadResearchFundPageMock = loadResearchFundPage as jest.Mock;
const loadPoliticianPhotoUrlMock = loadPoliticianPhotoUrl as jest.Mock;

const SECRET = "test-secret";
const TOKEN = deriveResearchFundPreviewToken(SECRET, "sample-taro");
const detailed = { nodes: [{ id: "t", label: "合計", nodeType: "total" }], links: [] };
const pageData = (isPublic: boolean, hasPhoto = false) => ({
  politician: { name: "サンプル太郎", slug: "sample-taro", hasPhoto },
  isPublic,
  kpi: { granted: 6_750_000, spent: 3_260_000 },
  sankey: { detailed, legal: detailed },
});

describe("loadResearchFundOgImageData", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    process.env.RESEARCH_FUND_PREVIEW_SECRET = SECRET;
    loadResearchFundPageMock.mockReset();
    loadPoliticianPhotoUrlMock.mockReset();
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  afterAll(() => {
    delete process.env.RESEARCH_FUND_PREVIEW_SECRET;
  });

  it("公開中の議員は、名前・詳細の区分の図・支給総額と支出総額を返す", async () => {
    loadResearchFundPageMock.mockResolvedValue(pageData(true));

    expect(await loadResearchFundOgImageData("sample-taro", 2026)).toEqual({
      slug: "sample-taro",
      name: "サンプル太郎",
      sankey: detailed,
      totals: { in: 6_750_000, out: 3_260_000 },
      photo: null,
    });
    expect(loadPoliticianPhotoUrlMock).not.toHaveBeenCalled();
  });

  it("公開していない議員は、公開 URL では null（ページと同じく開けない）", async () => {
    loadResearchFundPageMock.mockResolvedValue(pageData(false));

    expect(await loadResearchFundOgImageData("sample-taro", 2026)).toBeNull();
  });

  it("公開していない議員も、プレビュー URL ならデータを返し、写真もプレビュー URL で取る", async () => {
    loadResearchFundPageMock.mockResolvedValue(pageData(false, true));
    loadPoliticianPhotoUrlMock.mockResolvedValue("https://storage.example/photo.jpg");
    fetchMock.mockResolvedValue(new Response(new Uint8Array([0xff, 0xd8, 0xff])));

    const data = await loadResearchFundOgImageData(`sample-taro~${TOKEN}`, 2026);

    expect(data?.slug).toBe("sample-taro");
    expect(data?.photo).toEqual(new Uint8Array([0xff, 0xd8, 0xff]));
    expect(loadPoliticianPhotoUrlMock).toHaveBeenCalledWith(`sample-taro~${TOKEN}`);
  });

  it("写真が取れなくても、写真なしでデータを返す", async () => {
    loadResearchFundPageMock.mockResolvedValue(pageData(true, true));
    loadPoliticianPhotoUrlMock.mockRejectedValue(new Error("storage down"));

    expect((await loadResearchFundOgImageData("sample-taro", 2026))?.photo).toBeNull();
  });

  it("写真の取得に時間制限を付け、登録の上限（3MB）より大きい写真は写真なしにする", async () => {
    loadResearchFundPageMock.mockResolvedValue(pageData(true, true));
    loadPoliticianPhotoUrlMock.mockResolvedValue("https://storage.example/photo.jpg");
    fetchMock.mockResolvedValue(new Response(new Uint8Array(3 * 1024 * 1024 + 1)));

    expect((await loadResearchFundOgImageData("sample-taro", 2026))?.photo).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://storage.example/photo.jpg",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("写真の取得が時間切れになっても、写真なしでデータを返す", async () => {
    loadResearchFundPageMock.mockResolvedValue(pageData(true, true));
    loadPoliticianPhotoUrlMock.mockResolvedValue("https://storage.example/photo.jpg");
    fetchMock.mockRejectedValue(new DOMException("timeout", "TimeoutError"));

    expect((await loadResearchFundOgImageData("sample-taro", 2026))?.photo).toBeNull();
  });

  it("議員・年のデータが無ければ null", async () => {
    loadResearchFundPageMock.mockResolvedValue(null);

    expect(await loadResearchFundOgImageData("nobody", 2026)).toBeNull();
  });
});
