jest.mock("next/cache", () => ({ revalidateTag: jest.fn() }));

import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { POST } from "@/app/api/refresh/route";
import { RESEARCH_FUND_CACHE_TAG } from "@/server/contexts/research-fund/presentation/loaders/constants";

const revalidateTagMock = revalidateTag as jest.Mock;

const request = (token?: string) =>
  new Request("http://localhost/api/refresh", {
    method: "POST",
    headers: token ? { "x-refresh-token": token } : {},
  }) as unknown as NextRequest;

describe("POST /api/refresh", () => {
  const originalToken = process.env.DATA_REFRESH_TOKEN;

  beforeEach(() => {
    revalidateTagMock.mockReset();
    process.env.DATA_REFRESH_TOKEN = "secret";
  });

  afterAll(() => {
    process.env.DATA_REFRESH_TOKEN = originalToken;
  });

  it("調研費のタグは古いデータを返さないよう即時に失効させる（sitemap が公開前の一覧で固まらないように）", async () => {
    const response = await POST(request("secret"));

    expect(response.status).toBe(200);
    expect(revalidateTagMock).toHaveBeenCalledWith(RESEARCH_FUND_CACHE_TAG, { expire: 0 });
    expect(revalidateTagMock).not.toHaveBeenCalledWith(RESEARCH_FUND_CACHE_TAG, "max");
  });

  it("政治団体のタグは従来どおり古いデータを返しつつ作り直す", async () => {
    await POST(request("secret"));

    expect(revalidateTagMock).toHaveBeenCalledWith("organizations", "max");
    expect(revalidateTagMock).toHaveBeenCalledWith("top-page-data", "max");
  });

  it("トークンが一致しなければキャッシュを無効化しない", async () => {
    const response = await POST(request("wrong"));

    expect(response.status).toBe(401);
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });
});
