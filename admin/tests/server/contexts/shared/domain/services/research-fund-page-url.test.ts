import { buildResearchFundPageUrl } from "@/server/contexts/shared/domain/services/research-fund-page-url";
import { parsePoliticianPathSegment } from "@/shared/research-fund/preview-path";
import {
  deriveResearchFundPreviewToken,
  verifyResearchFundPreviewToken,
} from "@/shared/research-fund/preview-token";

const SECRET = "test-secret";

describe("buildResearchFundPageUrl", () => {
  it("公開する議員には、文字列なしの公開 URL を出す", () => {
    expect(
      buildResearchFundPageUrl({
        webappUrl: "https://marumie.team-mir.ai/",
        previewSecret: SECRET,
        slug: "sample-taro",
        isResearchFundPublic: true,
      }),
    ).toEqual({ kind: "public", url: "https://marumie.team-mir.ai/p/sample-taro" });
  });

  it("公開しない議員には、webapp が照合できるプレビュー URL を出す", () => {
    const pageUrl = buildResearchFundPageUrl({
      webappUrl: "https://marumie.team-mir.ai",
      previewSecret: SECRET,
      slug: "sample-taro",
      isResearchFundPublic: false,
    });

    const token = deriveResearchFundPreviewToken(SECRET, "sample-taro");
    expect(pageUrl).toEqual({
      kind: "preview",
      url: `https://marumie.team-mir.ai/p/sample-taro~${token}`,
    });
    const segment = new URL(pageUrl.kind === "preview" ? pageUrl.url : "").pathname.split("/")[2];
    const { slug, previewToken } = parsePoliticianPathSegment(segment);
    expect(slug).toBe("sample-taro");
    expect(verifyResearchFundPreviewToken(SECRET, slug, previewToken ?? "")).toBe(true);
  });

  it("鍵が未設定なら、公開しない議員の URL は作れない", () => {
    expect(
      buildResearchFundPageUrl({
        webappUrl: "https://marumie.team-mir.ai",
        previewSecret: null,
        slug: "sample-taro",
        isResearchFundPublic: false,
      }),
    ).toEqual({ kind: "unavailable" });
  });

  it("鍵が未設定でも、公開する議員の URL は出せる", () => {
    expect(
      buildResearchFundPageUrl({
        webappUrl: "https://marumie.team-mir.ai",
        previewSecret: null,
        slug: "sample-taro",
        isResearchFundPublic: true,
      }).kind,
    ).toBe("public");
  });
});
