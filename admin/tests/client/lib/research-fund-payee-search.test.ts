import { filterPayees } from "@/client/lib/research-fund-payee-search";

const payees = [
  { name: "東京ﾀｸｼｰ", address: "東京都千代田区千代田1-1", invoiceRegistrationNumber: "T1234567890123" },
  { name: "ABC Printing", address: "大阪府大阪市北区1-2", invoiceRegistrationNumber: null },
  { name: "貸会議室センター", address: "", invoiceRegistrationNumber: null },
];

describe("filterPayees", () => {
  it("空の検索語なら全件を渡された順のまま返す", () => {
    expect(filterPayees(payees, "  ")).toEqual(payees);
  });

  it("名前・住所・登録番号のいずれかに一致するものに絞り込む", () => {
    expect(filterPayees(payees, "会議室").map((p) => p.name)).toEqual(["貸会議室センター"]);
    expect(filterPayees(payees, "大阪市").map((p) => p.name)).toEqual(["ABC Printing"]);
    expect(filterPayees(payees, "T12345").map((p) => p.name)).toEqual(["東京ﾀｸｼｰ"]);
  });

  it("全角/半角・大文字/小文字の違いを無視する", () => {
    expect(filterPayees(payees, "タクシー").map((p) => p.name)).toEqual(["東京ﾀｸｼｰ"]);
    expect(filterPayees(payees, "ａｂｃ printing").map((p) => p.name)).toEqual(["ABC Printing"]);
    expect(filterPayees(payees, "t1234").map((p) => p.name)).toEqual(["東京ﾀｸｼｰ"]);
  });

  it("空白で区切った語はすべて含まれるものだけに絞る（別々の欄に一致してよい）", () => {
    expect(filterPayees(payees, "タクシー 千代田").map((p) => p.name)).toEqual(["東京ﾀｸｼｰ"]);
    expect(filterPayees(payees, "タクシー 大阪")).toEqual([]);
  });
});
