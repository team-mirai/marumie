import {
  findDuplicateDocuments,
  type ScannedDocument,
} from "@/server/contexts/research-fund/domain/models/duplicate-document";

type Issuer = { name?: string | null; invoice_registration_number?: string | null } | null;

function receipt(options: { date?: string; amounts?: number[]; issuer?: Issuer } = {}) {
  const issuer = options.issuer === undefined ? { name: "東京タクシー" } : options.issuer;
  return {
    date: options.date ?? "2026-09-01",
    issuer:
      issuer === null
        ? null
        : {
            name: issuer.name ?? null,
            address: null,
            phone: null,
            invoice_registration_number: issuer.invoice_registration_number ?? null,
          },
    items: (options.amounts ?? [1200]).map((amount) => ({
      item: "タクシー代",
      date: null,
      amount,
      category_key: "transportation",
      note: null,
      memo: null,
      split_group: null,
    })),
  };
}

function document(
  documentId: string,
  rawJson: unknown,
  payeeIds: string[] = [],
): ScannedDocument {
  return { documentId, originalFilename: `${documentId}.jpg`, rawJson, payeeIds };
}

describe("findDuplicateDocuments", () => {
  it("日付・合計金額・発行元が一致する書類を、お互いの重複として返す", () => {
    expect(
      findDuplicateDocuments([document("1", receipt()), document("2", receipt())]),
    ).toEqual({
      "1": [{ documentId: "2", originalFilename: "2.jpg", date: "2026-09-01", totalAmount: 1200 }],
      "2": [{ documentId: "1", originalFilename: "1.jpg", date: "2026-09-01", totalAmount: 1200 }],
    });
  });

  it("明細の分け方が違っても、合計金額が同じなら重複とみなす", () => {
    const result = findDuplicateDocuments([
      document("1", receipt({ amounts: [1200] })),
      document("2", receipt({ amounts: [1000, 200] })),
    ]);
    expect(Object.keys(result)).toEqual(["1", "2"]);
  });

  it("日付が違えば重複とみなさない", () => {
    expect(
      findDuplicateDocuments([
        document("1", receipt()),
        document("2", receipt({ date: "2026-09-02" })),
      ]),
    ).toEqual({});
  });

  it("合計金額が違えば重複とみなさない", () => {
    expect(
      findDuplicateDocuments([
        document("1", receipt()),
        document("2", receipt({ amounts: [1300] })),
      ]),
    ).toEqual({});
  });

  describe("発行元", () => {
    it("インボイス登録番号が食い違えば、名称が同じでも重複とみなさない", () => {
      expect(
        findDuplicateDocuments([
          document("1", receipt({ issuer: { name: "東京タクシー", invoice_registration_number: "T1234567890123" } })),
          document("2", receipt({ issuer: { name: "東京タクシー", invoice_registration_number: "T9999999999999" } })),
        ]),
      ).toEqual({});
    });

    it("インボイス登録番号が一致すれば、名称が違っても重複とみなす（表記の揺れを番号で吸収する）", () => {
      const result = findDuplicateDocuments([
        document("1", receipt({ issuer: { name: "東京タクシー", invoice_registration_number: "T1234567890123" } })),
        document("2", receipt({ issuer: { name: "東京交通", invoice_registration_number: "Ｔ1234567890123" } })),
      ]);
      expect(Object.keys(result)).toEqual(["1", "2"]);
    });

    it("番号が片方にしか無ければ、紐づいた支払先で比べる。支払先が食い違えば重複とみなさない", () => {
      expect(
        findDuplicateDocuments([
          document("1", receipt({ issuer: { name: "東京タクシー", invoice_registration_number: "T1234567890123" } }), ["7"]),
          document("2", receipt(), ["8"]),
        ]),
      ).toEqual({});
    });

    it("紐づいた支払先が同じなら、名称が違っても重複とみなす", () => {
      const result = findDuplicateDocuments([
        document("1", receipt({ issuer: { name: "東京タクシー" } }), ["7"]),
        document("2", receipt({ issuer: { name: "東京交通" } }), ["7"]),
      ]);
      expect(Object.keys(result)).toEqual(["1", "2"]);
    });

    it("支払先が 1 つに決まらない書類では支払先を使わず、名称で比べる", () => {
      expect(
        findDuplicateDocuments([
          document("1", receipt({ issuer: { name: "東京タクシー" } }), ["7", "8"]),
          document("2", receipt({ issuer: { name: "東京交通" } }), ["7"]),
        ]),
      ).toEqual({});
    });

    it("名称が食い違えば重複とみなさない", () => {
      expect(
        findDuplicateDocuments([
          document("1", receipt({ issuer: { name: "東京タクシー" } })),
          document("2", receipt({ issuer: { name: "大阪タクシー" } })),
        ]),
      ).toEqual({});
    });

    it("名称は全角半角・空白・法人格の略記の揺れを除いて比べる", () => {
      const result = findDuplicateDocuments([
        document("1", receipt({ issuer: { name: "株式会社 ＡＢＣ商店" } })),
        document("2", receipt({ issuer: { name: "㈱abc商店" } })),
      ]);
      expect(Object.keys(result)).toEqual(["1", "2"]);
    });

    it("発行元が片方で読み取れなければ、日付と合計金額だけで重複とみなす", () => {
      const result = findDuplicateDocuments([
        document("1", receipt({ issuer: null })),
        document("2", receipt({ issuer: { name: "東京タクシー" } })),
      ]);
      expect(Object.keys(result)).toEqual(["1", "2"]);
    });

    it("形の合わないインボイス登録番号は分からないものとして扱う", () => {
      const result = findDuplicateDocuments([
        document("1", receipt({ issuer: { name: "東京タクシー", invoice_registration_number: "T123" } })),
        document("2", receipt({ issuer: { name: "東京タクシー", invoice_registration_number: "T9999999999999" } })),
      ]);
      expect(Object.keys(result)).toEqual(["1", "2"]);
    });
  });

  it("3 枚以上が重なれば、それぞれに他のすべてを返す", () => {
    const result = findDuplicateDocuments([
      document("1", receipt()),
      document("2", receipt()),
      document("3", receipt()),
    ]);
    expect(result["1"].map((d) => d.documentId)).toEqual(["2", "3"]);
    expect(result["3"].map((d) => d.documentId)).toEqual(["1", "2"]);
  });

  it("相手が渡されなければ（仕訳をすべて取り消した書類は渡されない）警告は残らない", () => {
    expect(findDuplicateDocuments([document("1", receipt())])).toEqual({});
  });

  it("読み取りが無い・読めない書類は比べない", () => {
    expect(
      findDuplicateDocuments([
        document("1", receipt()),
        document("2", null),
        document("3", { date: "2026-09-01" }),
      ]),
    ).toEqual({});
  });
});
