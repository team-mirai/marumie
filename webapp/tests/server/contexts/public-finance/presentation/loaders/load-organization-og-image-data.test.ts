jest.mock("@/server/contexts/public-finance/presentation/loaders/load-organizations", () => ({
  loadOrganizations: jest.fn(),
}));
jest.mock("@/server/contexts/public-finance/presentation/loaders/load-top-page-data", () => ({
  loadTopPageData: jest.fn(),
}));
jest.mock("@/server/contexts/public-finance/presentation/loaders/load-organization-photo-url", () => ({
  loadOrganizationPhotoUrl: jest.fn(),
}));

import { loadOrganizationOgImageData } from "@/server/contexts/public-finance/presentation/loaders/load-organization-og-image-data";
import { loadOrganizationPhotoUrl } from "@/server/contexts/public-finance/presentation/loaders/load-organization-photo-url";
import { loadOrganizations } from "@/server/contexts/public-finance/presentation/loaders/load-organizations";
import { loadTopPageData } from "@/server/contexts/public-finance/presentation/loaders/load-top-page-data";

const loadOrganizationsMock = loadOrganizations as jest.Mock;
const loadTopPageDataMock = loadTopPageData as jest.Mock;
const loadOrganizationPhotoUrlMock = loadOrganizationPhotoUrl as jest.Mock;

const PHOTO_URL = "https://storage.example/photo.jpg";
const friendly = { nodes: [{ id: "t", label: "合計", nodeType: "total" }], links: [] };
const summary = { income: 1_000_000, expense: 600_000, balance: 400_000 };

describe("loadOrganizationOgImageData", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    loadOrganizationsMock.mockReset();
    loadTopPageDataMock.mockReset();
    loadOrganizationPhotoUrlMock.mockReset();
    fetchMock.mockReset();
    global.fetch = fetchMock;

    loadOrganizationsMock.mockResolvedValue({
      organizations: [
        { slug: "sample-party", displayName: "サンプル党", kind: "party", hasPhoto: true },
        { slug: "sample-group", displayName: "サンプル会", kind: "group", hasPhoto: true },
      ],
    });
    loadTopPageDataMock.mockResolvedValue({ friendly, summary });
    loadOrganizationPhotoUrlMock.mockResolvedValue(PHOTO_URL);
  });

  it("政治団体なら代表者の顔写真を時間制限付きで取り、データと一緒に返す", async () => {
    fetchMock.mockResolvedValue(new Response(new Uint8Array([0xff, 0xd8, 0xff])));

    expect(await loadOrganizationOgImageData("sample-group", 2026)).toEqual({
      displayName: "サンプル会",
      kind: "group",
      friendly,
      summary,
      photo: new Uint8Array([0xff, 0xd8, 0xff]),
    });
    expect(fetchMock).toHaveBeenCalledWith(
      PHOTO_URL,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("写真の取得が時間切れになったら、写真なしでデータを返す", async () => {
    fetchMock.mockRejectedValue(new DOMException("timeout", "TimeoutError"));

    const data = await loadOrganizationOgImageData("sample-group", 2026);

    expect(data?.displayName).toBe("サンプル会");
    expect(data?.photo).toBeNull();
  });

  it("content-length が登録の上限（3MB）を超える写真は、本文を読まずに写真なしにする", async () => {
    const response = new Response(new Uint8Array([0xff, 0xd8, 0xff]), {
      headers: { "content-length": String(3 * 1024 * 1024 + 1) },
    });
    const arrayBuffer = jest.spyOn(response, "arrayBuffer");
    fetchMock.mockResolvedValue(response);

    const data = await loadOrganizationOgImageData("sample-group", 2026);

    expect(data?.photo).toBeNull();
    expect(arrayBuffer).not.toHaveBeenCalled();
  });

  it("実データが登録の上限（3MB）を超える写真は、写真なしにする", async () => {
    fetchMock.mockResolvedValue(new Response(new Uint8Array(3 * 1024 * 1024 + 1)));

    expect((await loadOrganizationOgImageData("sample-group", 2026))?.photo).toBeNull();
  });

  it("ちょうど上限（3MB）の写真は使う", async () => {
    fetchMock.mockResolvedValue(new Response(new Uint8Array(3 * 1024 * 1024)));

    expect((await loadOrganizationOgImageData("sample-group", 2026))?.photo?.byteLength).toBe(3 * 1024 * 1024);
  });

  it("政党なら（見出しはロゴなので）写真を取りに行かず、政党の種別を返す", async () => {
    const data = await loadOrganizationOgImageData("sample-party", 2026);

    expect(data?.kind).toBe("party");
    expect(data?.photo).toBeNull();
    expect(loadOrganizationPhotoUrlMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("団体が無ければ null", async () => {
    expect(await loadOrganizationOgImageData("nobody", 2026)).toBeNull();
  });
});
