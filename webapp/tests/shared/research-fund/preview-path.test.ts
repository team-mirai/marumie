import {
  buildPoliticianPathSegment,
  parsePoliticianPathSegment,
} from "@/shared/research-fund/preview-path";

const TOKEN = "0123456789abcdef0123456789abcdef";

describe("プレビュー URL の slug の区間", () => {
  it("プレビュー用の文字列が無ければ slug だけを返す", () => {
    expect(parsePoliticianPathSegment("sample-taro")).toEqual({
      slug: "sample-taro",
      previewToken: null,
    });
  });

  it("「slug~文字列」を slug とプレビュー用の文字列に分ける", () => {
    expect(parsePoliticianPathSegment(`sample-taro~${TOKEN}`)).toEqual({
      slug: "sample-taro",
      previewToken: TOKEN,
    });
  });

  it("文字列の形（16 進 32 文字）に合わなければ、区切りを含めて slug として扱う", () => {
    expect(parsePoliticianPathSegment("sample~taro")).toEqual({
      slug: "sample~taro",
      previewToken: null,
    });
    expect(parsePoliticianPathSegment(`~${TOKEN}`)).toEqual({
      slug: `~${TOKEN}`,
      previewToken: null,
    });
  });

  it("組み立てと読み取りが往復する", () => {
    const segment = buildPoliticianPathSegment("sample-taro", TOKEN);

    expect(segment).toBe(`sample-taro~${TOKEN}`);
    expect(encodeURIComponent(segment)).toBe(segment);
    expect(parsePoliticianPathSegment(segment)).toEqual({ slug: "sample-taro", previewToken: TOKEN });
  });

  it("プレビュー用の文字列が無ければ slug をそのまま返す", () => {
    expect(buildPoliticianPathSegment("sample-taro", null)).toBe("sample-taro");
  });
});
