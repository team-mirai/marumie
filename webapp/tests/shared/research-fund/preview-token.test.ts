import { parsePoliticianPathSegment } from "@/shared/research-fund/preview-path";
import {
  deriveResearchFundPreviewToken,
  readResearchFundPreviewSecret,
  verifyResearchFundPreviewToken,
} from "@/shared/research-fund/preview-token";

const SECRET = "test-secret";

describe("プレビュー用の文字列", () => {
  it("同じ鍵と slug からは同じ文字列ができ、URL の区間として読み取れる形になる", () => {
    const token = deriveResearchFundPreviewToken(SECRET, "sample-taro");

    expect(token).toBe(deriveResearchFundPreviewToken(SECRET, "sample-taro"));
    expect(parsePoliticianPathSegment(`sample-taro~${token}`).previewToken).toBe(token);
  });

  it("鍵が違えば、同じ slug でも文字列が変わる（slug とソースコードだけからは作れない）", () => {
    expect(deriveResearchFundPreviewToken("other-secret", "sample-taro")).not.toBe(
      deriveResearchFundPreviewToken(SECRET, "sample-taro"),
    );
  });

  it("slug が違えば文字列も変わる", () => {
    expect(deriveResearchFundPreviewToken(SECRET, "sample-hanako")).not.toBe(
      deriveResearchFundPreviewToken(SECRET, "sample-taro"),
    );
  });

  it("正しい文字列だけを通す", () => {
    const token = deriveResearchFundPreviewToken(SECRET, "sample-taro");

    expect(verifyResearchFundPreviewToken(SECRET, "sample-taro", token)).toBe(true);
    expect(verifyResearchFundPreviewToken(SECRET, "sample-hanako", token)).toBe(false);
    expect(verifyResearchFundPreviewToken(SECRET, "sample-taro", "0".repeat(32))).toBe(false);
    expect(verifyResearchFundPreviewToken(SECRET, "sample-taro", token.slice(0, 10))).toBe(false);
  });

  it("鍵が無ければ、どの文字列も通さない", () => {
    const token = deriveResearchFundPreviewToken("", "sample-taro");

    expect(verifyResearchFundPreviewToken(null, "sample-taro", token)).toBe(false);
  });

  it("環境変数が未設定・空なら鍵は null", () => {
    expect(readResearchFundPreviewSecret({})).toBeNull();
    expect(readResearchFundPreviewSecret({ RESEARCH_FUND_PREVIEW_SECRET: "" })).toBeNull();
    expect(readResearchFundPreviewSecret({ RESEARCH_FUND_PREVIEW_SECRET: SECRET })).toBe(SECRET);
  });
});
