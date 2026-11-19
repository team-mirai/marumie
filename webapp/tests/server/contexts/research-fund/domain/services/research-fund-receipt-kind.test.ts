import { receiptKindOf } from "@/server/contexts/research-fund/domain/services/research-fund-receipt-kind";

describe("receiptKindOf", () => {
  it("admin が受け付ける画像は image になる", () => {
    expect(receiptKindOf("image/jpeg")).toBe("image");
    expect(receiptKindOf("image/png")).toBe("image");
  });

  it("PDF は pdf になる", () => {
    expect(receiptKindOf("application/pdf")).toBe("pdf");
  });

  it("MIME のパラメータや大文字を無視して判定する", () => {
    expect(receiptKindOf("APPLICATION/PDF")).toBe("pdf");
    expect(receiptKindOf("image/jpeg; charset=binary")).toBe("image");
  });

  it("領収書が無い・判定できない形式は null（埋め込まずリンクだけ出す）", () => {
    expect(receiptKindOf(null)).toBeNull();
    expect(receiptKindOf("")).toBeNull();
    expect(receiptKindOf("application/octet-stream")).toBeNull();
  });
});
