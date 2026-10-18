import { researchFundDocumentUrl } from "@/client/lib/research-fund-document-url";

describe("researchFundDocumentUrl", () => {
  it("書類 ID と帳簿・政治家を含む書類表示 API の URL を返す", () => {
    expect(researchFundDocumentUrl({ politicianId: "p1", bookId: "12" }, "34")).toBe(
      "/api/research-fund/documents/34?bookId=12&politicianId=p1",
    );
  });

  it("公開用の版を指定すると version=masked を付ける", () => {
    expect(researchFundDocumentUrl({ politicianId: "p1", bookId: "12" }, "34", "masked")).toBe(
      "/api/research-fund/documents/34?bookId=12&politicianId=p1&version=masked",
    );
  });

  it("パラメータに含まれる記号はエスケープする", () => {
    expect(researchFundDocumentUrl({ politicianId: "a&b", bookId: "1" }, "x/y")).toBe(
      "/api/research-fund/documents/x%2Fy?bookId=1&politicianId=a%26b",
    );
  });
});
