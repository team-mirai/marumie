import {
  canServePoliticianPhoto,
  canViewResearchFundPage,
} from "@/server/contexts/research-fund/domain/services/research-fund-page-access";
import { deriveResearchFundPreviewToken } from "@/shared/research-fund/preview-token";

const SECRET = "test-secret";
const TOKEN = deriveResearchFundPreviewToken(SECRET, "sample-taro");

describe("canViewResearchFundPage", () => {
  it("公開する議員は、プレビュー用の文字列なしで開ける", () => {
    expect(
      canViewResearchFundPage({
        slug: "sample-taro",
        isPublic: true,
        previewToken: null,
        previewSecret: SECRET,
      }),
    ).toBe(true);
  });

  it("公開しない議員は、文字列なしでは開けない", () => {
    expect(
      canViewResearchFundPage({
        slug: "sample-taro",
        isPublic: false,
        previewToken: null,
        previewSecret: SECRET,
      }),
    ).toBe(false);
  });

  it("公開しない議員は、正しい文字列があれば開ける", () => {
    expect(
      canViewResearchFundPage({
        slug: "sample-taro",
        isPublic: false,
        previewToken: TOKEN,
        previewSecret: SECRET,
      }),
    ).toBe(true);
  });

  it("文字列が間違っていれば、公開・非公開を問わず開けない", () => {
    for (const isPublic of [true, false]) {
      expect(
        canViewResearchFundPage({
          slug: "sample-taro",
          isPublic,
          previewToken: "0".repeat(32),
          previewSecret: SECRET,
        }),
      ).toBe(false);
    }
  });

  it("鍵が未設定なら、公開しない議員は誰も開けない", () => {
    expect(
      canViewResearchFundPage({
        slug: "sample-taro",
        isPublic: false,
        previewToken: TOKEN,
        previewSecret: null,
      }),
    ).toBe(false);
  });
});

describe("canServePoliticianPhoto", () => {
  const base = { slug: "sample-taro", previewToken: null, previewSecret: SECRET };

  it("議員ページを開ける議員の写真は配信する", () => {
    expect(canServePoliticianPhoto({ ...base, isPublic: true, isComingSoon: false })).toBe(true);
  });

  it("非公開でも「準備中」として一覧に出している議員の写真は配信する", () => {
    expect(canServePoliticianPhoto({ ...base, isPublic: false, isComingSoon: true })).toBe(true);
  });

  it("非公開で準備中でもない議員の写真は、プレビュー用の文字列が無ければ配信しない", () => {
    expect(canServePoliticianPhoto({ ...base, isPublic: false, isComingSoon: false })).toBe(false);
  });
});
