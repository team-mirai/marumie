import {
  PersonalDonationSection,
  type PersonalDonationTransaction,
} from "@/server/contexts/report/domain/models/donation-transaction";
import { ValidationErrorCode } from "@/server/contexts/report/domain/types/validation";

describe("PersonalDonationSection.fromTransactions", () => {
  it("converts personal donation transactions to PersonalDonationSection", () => {
    const transactionDate = new Date("2024-06-15");
    const transactions: PersonalDonationTransaction[] = [
      {
        transactionNo: "1",
        transactionDate,
        debitAmount: 0,
        creditAmount: 100000,
        memo: "寄附金受領",
        donorName: "山田太郎",
        donorAddress: "東京都渋谷区代々木1-1-1",
        donorOccupation: "会社員",
      },
    ];

    const section = PersonalDonationSection.fromTransactions(transactions);

    expect(section.totalAmount).toBe(100000);
    expect(section.sonotaGk).toBe(0);
    expect(section.rows).toHaveLength(1);
    expect(section.rows[0]).toMatchObject({
      ichirenNo: "1",
      kifusyaNm: "山田太郎",
      kingaku: 100000,
      dt: transactionDate,
      adr: "東京都渋谷区代々木1-1-1",
      syokugyo: "会社員",
      zeigakukoujyo: "0",
      rowkbn: "0",
    });
    expect(section.rows[0].bikou).toContain("寄附金受領");
    expect(section.rows[0].bikou).toContain("MF行番号: 1");
  });

  it("calculates total amount from multiple transactions", () => {
    const transactions: PersonalDonationTransaction[] = [
      {
        transactionNo: "1",
        transactionDate: new Date("2024-06-01"),
        debitAmount: 0,
        creditAmount: 50000,
        memo: null,
        donorName: "田中一郎",
        donorAddress: "大阪府大阪市北区1-1",
        donorOccupation: "自営業",
      },
      {
        transactionNo: "2",
        transactionDate: new Date("2024-06-15"),
        debitAmount: 0,
        creditAmount: 30000,
        memo: null,
        donorName: "鈴木花子",
        donorAddress: "神奈川県横浜市中区2-2",
        donorOccupation: "公務員",
      },
    ];

    const section = PersonalDonationSection.fromTransactions(transactions);

    expect(section.totalAmount).toBe(80000);
    expect(section.rows).toHaveLength(2);
    expect(section.rows[0].ichirenNo).toBe("1");
    expect(section.rows[1].ichirenNo).toBe("2");
  });

  it("returns empty section when no transactions", () => {
    const section = PersonalDonationSection.fromTransactions([]);

    expect(section.totalAmount).toBe(0);
    expect(section.sonotaGk).toBe(0);
    expect(section.rows).toHaveLength(0);
  });

  it("uses debitAmount when creditAmount is zero", () => {
    const transactions: PersonalDonationTransaction[] = [
      {
        transactionNo: "1",
        transactionDate: new Date("2024-07-01"),
        debitAmount: 75000,
        creditAmount: 0,
        memo: null,
        donorName: "佐藤次郎",
        donorAddress: "愛知県名古屋市中村区3-3",
        donorOccupation: "医師",
      },
    ];

    const section = PersonalDonationSection.fromTransactions(transactions);

    expect(section.totalAmount).toBe(75000);
    expect(section.rows[0].kingaku).toBe(75000);
  });
});

describe("PersonalDonationSection.validate", () => {
  it("空のセクションでエラーを返さない", () => {
    const section = {
      totalAmount: 0,
      sonotaGk: 0,
      rows: [],
    };
    const errors = PersonalDonationSection.validate(section);

    expect(errors).toHaveLength(0);
  });

  it("正常なデータでエラーを返さない", () => {
    const section = {
      totalAmount: 100000,
      sonotaGk: 0,
      rows: [
        {
          ichirenNo: "1",
          kifusyaNm: "山田太郎",
          kingaku: 100000,
          dt: new Date("2024-01-01"),
          adr: "東京都千代田区",
          syokugyo: "会社員",
          zeigakukoujyo: "0",
          rowkbn: "0",
        },
      ],
    };
    const errors = PersonalDonationSection.validate(section);

    expect(errors).toHaveLength(0);
  });

  it("寄附者氏名が空の場合エラーを返す", () => {
    const section = {
      totalAmount: 100000,
      sonotaGk: 0,
      rows: [
        {
          ichirenNo: "1",
          kifusyaNm: "",
          kingaku: 100000,
          dt: new Date("2024-01-01"),
          adr: "東京都",
          syokugyo: "会社員",
          zeigakukoujyo: "0",
          rowkbn: "0",
        },
      ],
    };
    const errors = PersonalDonationSection.validate(section);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].code).toBe(ValidationErrorCode.REQUIRED);
    expect(errors[0].path).toContain("kifusyaNm");
  });

  it("金額が0以下の場合エラーを返す", () => {
    const section = {
      totalAmount: 0,
      sonotaGk: 0,
      rows: [
        {
          ichirenNo: "1",
          kifusyaNm: "山田太郎",
          kingaku: 0,
          dt: new Date("2024-01-01"),
          adr: "東京都",
          syokugyo: "会社員",
          zeigakukoujyo: "0",
          rowkbn: "0",
        },
      ],
    };
    const errors = PersonalDonationSection.validate(section);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].code).toBe(ValidationErrorCode.NEGATIVE_VALUE);
  });

  it("年月日が空の場合エラーを返す", () => {
    const section = {
      totalAmount: 100000,
      sonotaGk: 0,
      rows: [
        {
          ichirenNo: "1",
          kifusyaNm: "山田太郎",
          kingaku: 100000,
          dt: null as unknown as Date,
          adr: "東京都",
          syokugyo: "会社員",
          zeigakukoujyo: "0",
          rowkbn: "0",
        },
      ],
    };
    const errors = PersonalDonationSection.validate(section);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].code).toBe(ValidationErrorCode.REQUIRED);
  });

  it("住所が空の場合エラーを返す", () => {
    const section = {
      totalAmount: 100000,
      sonotaGk: 0,
      rows: [
        {
          ichirenNo: "1",
          kifusyaNm: "山田太郎",
          kingaku: 100000,
          dt: new Date("2024-01-01"),
          adr: "",
          syokugyo: "会社員",
          zeigakukoujyo: "0",
          rowkbn: "0",
        },
      ],
    };
    const errors = PersonalDonationSection.validate(section);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].code).toBe(ValidationErrorCode.REQUIRED);
  });

  it("職業が空の場合エラーを返す", () => {
    const section = {
      totalAmount: 100000,
      sonotaGk: 0,
      rows: [
        {
          ichirenNo: "1",
          kifusyaNm: "山田太郎",
          kingaku: 100000,
          dt: new Date("2024-01-01"),
          adr: "東京都",
          syokugyo: "",
          zeigakukoujyo: "0",
          rowkbn: "0",
        },
      ],
    };
    const errors = PersonalDonationSection.validate(section);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].code).toBe(ValidationErrorCode.REQUIRED);
  });

  it("寄附者氏名が120文字を超える場合エラーを返す", () => {
    const section = {
      totalAmount: 100000,
      sonotaGk: 0,
      rows: [
        {
          ichirenNo: "1",
          kifusyaNm: "あ".repeat(121),
          kingaku: 100000,
          dt: new Date("2024-01-01"),
          adr: "東京都",
          syokugyo: "会社員",
          zeigakukoujyo: "0",
          rowkbn: "0",
        },
      ],
    };
    const errors = PersonalDonationSection.validate(section);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].code).toBe(ValidationErrorCode.MAX_LENGTH_EXCEEDED);
  });

  it("複数行のエラーを集約する", () => {
    const section = {
      totalAmount: 200000,
      sonotaGk: 0,
      rows: [
        {
          ichirenNo: "1",
          kifusyaNm: "",
          kingaku: 100000,
          dt: new Date("2024-01-01"),
          adr: "東京都",
          syokugyo: "会社員",
          zeigakukoujyo: "0",
          rowkbn: "0",
        },
        {
          ichirenNo: "2",
          kifusyaNm: "田中花子",
          kingaku: 0,
          dt: new Date("2024-01-02"),
          adr: "大阪府",
          syokugyo: "自営業",
          zeigakukoujyo: "0",
          rowkbn: "0",
        },
      ],
    };
    const errors = PersonalDonationSection.validate(section);

    expect(errors.length).toBeGreaterThanOrEqual(2);
  });
});
