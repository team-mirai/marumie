jest.mock("@/server/contexts/research-fund/presentation/loaders/load-politician-photo-url", () => ({
  loadPoliticianPhotoUrl: jest.fn(),
}));

import { GET } from "@/app/api/research-fund/politicians/[pathSlug]/photo/route";
import { loadPoliticianPhotoUrl } from "@/server/contexts/research-fund/presentation/loaders/load-politician-photo-url";

const loadPoliticianPhotoUrlMock = loadPoliticianPhotoUrl as jest.Mock;

function get(pathSlug: string) {
  return GET(new Request(`http://localhost/api/research-fund/politicians/${pathSlug}/photo`), {
    params: Promise.resolve({ pathSlug }),
  });
}

describe("GET /api/research-fund/politicians/[pathSlug]/photo", () => {
  beforeEach(() => {
    loadPoliticianPhotoUrlMock.mockReset();
  });

  it("配信できる写真なら、キャッシュさせずに署名URLへリダイレクトする", async () => {
    loadPoliticianPhotoUrlMock.mockResolvedValue("https://storage.example/signed");

    const response = await get("sample-taro");

    expect(loadPoliticianPhotoUrlMock).toHaveBeenCalledWith("sample-taro");
    expect(response.status).toBe(307);
    expect(response.headers.get("Location")).toBe("https://storage.example/signed");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("配信できない（非公開の議員・未登録）なら 404 を返す", async () => {
    loadPoliticianPhotoUrlMock.mockResolvedValue(null);

    const response = await get("sample-hanako");

    expect(response.status).toBe(404);
    expect(response.headers.get("Location")).toBeNull();
  });
});
