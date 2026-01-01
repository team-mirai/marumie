import {
  PersonalDonationSection,
  type PersonalDonationTransaction,
  DONATION_DETAIL_THRESHOLD,
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
        donorId: "123",
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

  it("calculates total amount from multiple transactions with different donors over threshold", () => {
    const transactions: PersonalDonationTransaction[] = [
      {
        transactionNo: "1",
        transactionDate: new Date("2024-06-01"),
        debitAmount: 0,
        creditAmount: 60000,
        memo: null,
        donorId: "1",
        donorName: "田中一郎",
        donorAddress: "大阪府大阪市北区1-1",
        donorOccupation: "自営業",
      },
      {
        transactionNo: "2",
        transactionDate: new Date("2024-06-15"),
        debitAmount: 0,
        creditAmount: 60000,
        memo: null,
        donorId: "2",
        donorName: "鈴木花子",
        donorAddress: "神奈川県横浜市中区2-2",
        donorOccupation: "公務員",
      },
    ];

    const section = PersonalDonationSection.fromTransactions(transactions);

    expect(section.totalAmount).toBe(120000);
    expect(section.sonotaGk).toBe(0);
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
        donorId: "123",
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

describe("PersonalDonationSection.fromTransactions - 5万円超ルール", () => {
  it("5万円超の寄附者のみ → 全件が明細、sonotaGk = 0", () => {
    const transactions: PersonalDonationTransaction[] = [
      {
        transactionNo: "1",
        transactionDate: new Date("2024-04-01"),
        debitAmount: 0,
        creditAmount: 60000,
        memo: null,
        donorId: "123",
        donorName: "田中太郎",
        donorAddress: "東京都千代田区1-1",
        donorOccupation: "会社員",
      },
    ];

    const section = PersonalDonationSection.fromTransactions(transactions);

    expect(section.totalAmount).toBe(60000);
    expect(section.sonotaGk).toBe(0);
    expect(section.rows).toHaveLength(1);
  });

  it("5万円以下の寄附者のみ → 明細なし、sonotaGk = 全額", () => {
    const transactions: PersonalDonationTransaction[] = [
      {
        transactionNo: "1",
        transactionDate: new Date("2024-04-01"),
        debitAmount: 0,
        creditAmount: 25000,
        memo: null,
        donorId: "456",
        donorName: "鈴木花子",
        donorAddress: "大阪府大阪市1-1",
        donorOccupation: "自営業",
      },
      {
        transactionNo: "2",
        transactionDate: new Date("2024-05-01"),
        debitAmount: 0,
        creditAmount: 20000,
        memo: null,
        donorId: "789",
        donorName: "佐藤一郎",
        donorAddress: "愛知県名古屋市1-1",
        donorOccupation: "公務員",
      },
    ];

    const section = PersonalDonationSection.fromTransactions(transactions);

    expect(section.totalAmount).toBe(45000);
    expect(section.sonotaGk).toBe(45000);
    expect(section.rows).toHaveLength(0);
  });

  it("混在ケース: 5万円超と5万円以下の寄附者が混在", () => {
    const transactions: PersonalDonationTransaction[] = [
      {
        transactionNo: "1",
        transactionDate: new Date("2024-04-01"),
        debitAmount: 0,
        creditAmount: 30000,
        memo: null,
        donorId: "123",
        donorName: "田中太郎",
        donorAddress: "東京都千代田区1-1",
        donorOccupation: "会社員",
      },
      {
        transactionNo: "2",
        transactionDate: new Date("2024-06-15"),
        debitAmount: 0,
        creditAmount: 40000,
        memo: null,
        donorId: "123",
        donorName: "田中太郎",
        donorAddress: "東京都千代田区1-1",
        donorOccupation: "会社員",
      },
      {
        transactionNo: "3",
        transactionDate: new Date("2024-05-01"),
        debitAmount: 0,
        creditAmount: 25000,
        memo: null,
        donorId: "456",
        donorName: "鈴木花子",
        donorAddress: "大阪府大阪市1-1",
        donorOccupation: "自営業",
      },
      {
        transactionNo: "4",
        transactionDate: new Date("2024-07-01"),
        debitAmount: 0,
        creditAmount: 20000,
        memo: null,
        donorId: "789",
        donorName: "佐藤一郎",
        donorAddress: "愛知県名古屋市1-1",
        donorOccupation: "公務員",
      },
    ];

    const section = PersonalDonationSection.fromTransactions(transactions);

    expect(section.totalAmount).toBe(115000);
    expect(section.sonotaGk).toBe(45000);
    expect(section.rows).toHaveLength(2);
    expect(section.rows[0].kifusyaNm).toBe("田中太郎");
    expect(section.rows[0].kingaku).toBe(30000);
    expect(section.rows[1].kifusyaNm).toBe("田中太郎");
    expect(section.rows[1].kingaku).toBe(40000);
  });

  it("境界値テスト: 年間ちょうど50,000円 → その他に合算", () => {
    const transactions: PersonalDonationTransaction[] = [
      {
        transactionNo: "1",
        transactionDate: new Date("2024-04-01"),
        debitAmount: 0,
        creditAmount: 50000,
        memo: null,
        donorId: "123",
        donorName: "田中太郎",
        donorAddress: "東京都千代田区1-1",
        donorOccupation: "会社員",
      },
    ];

    const section = PersonalDonationSection.fromTransactions(transactions);

    expect(section.totalAmount).toBe(50000);
    expect(section.sonotaGk).toBe(50000);
    expect(section.rows).toHaveLength(0);
  });

  it("境界値テスト: 年間50,001円 → 明細に記載", () => {
    const transactions: PersonalDonationTransaction[] = [
      {
        transactionNo: "1",
        transactionDate: new Date("2024-04-01"),
        debitAmount: 0,
        creditAmount: 50001,
        memo: null,
        donorId: "123",
        donorName: "田中太郎",
        donorAddress: "東京都千代田区1-1",
        donorOccupation: "会社員",
      },
    ];

    const section = PersonalDonationSection.fromTransactions(transactions);

    expect(section.totalAmount).toBe(50001);
    expect(section.sonotaGk).toBe(0);
    expect(section.rows).toHaveLength(1);
  });

  it("同一者からの複数取引（5万円超）→ 複数の明細行", () => {
    const transactions: PersonalDonationTransaction[] = [
      {
        transactionNo: "1",
        transactionDate: new Date("2024-04-01"),
        debitAmount: 0,
        creditAmount: 30000,
        memo: null,
        donorId: "123",
        donorName: "田中太郎",
        donorAddress: "東京都千代田区1-1",
        donorOccupation: "会社員",
      },
      {
        transactionNo: "2",
        transactionDate: new Date("2024-05-01"),
        debitAmount: 0,
        creditAmount: 30000,
        memo: null,
        donorId: "123",
        donorName: "田中太郎",
        donorAddress: "東京都千代田区1-1",
        donorOccupation: "会社員",
      },
      {
        transactionNo: "3",
        transactionDate: new Date("2024-06-01"),
        debitAmount: 0,
        creditAmount: 30000,
        memo: null,
        donorId: "123",
        donorName: "田中太郎",
        donorAddress: "東京都千代田区1-1",
        donorOccupation: "会社員",
      },
    ];

    const section = PersonalDonationSection.fromTransactions(transactions);

    expect(section.totalAmount).toBe(90000);
    expect(section.sonotaGk).toBe(0);
    expect(section.rows).toHaveLength(3);
  });

  it("donorId が null の取引は各取引を別人として扱う", () => {
    const transactions: PersonalDonationTransaction[] = [
      {
        transactionNo: "1",
        transactionDate: new Date("2024-04-01"),
        debitAmount: 0,
        creditAmount: 30000,
        memo: null,
        donorId: null,
        donorName: "不明者A",
        donorAddress: "東京都千代田区1-1",
        donorOccupation: "不明",
      },
      {
        transactionNo: "2",
        transactionDate: new Date("2024-05-01"),
        debitAmount: 0,
        creditAmount: 30000,
        memo: null,
        donorId: null,
        donorName: "不明者B",
        donorAddress: "大阪府大阪市1-1",
        donorOccupation: "不明",
      },
    ];

    const section = PersonalDonationSection.fromTransactions(transactions);

    expect(section.totalAmount).toBe(60000);
    expect(section.sonotaGk).toBe(60000);
    expect(section.rows).toHaveLength(0);
  });

  it("donorId が null で5万円超の取引は明細に記載", () => {
    const transactions: PersonalDonationTransaction[] = [
      {
        transactionNo: "1",
        transactionDate: new Date("2024-04-01"),
        debitAmount: 0,
        creditAmount: 60000,
        memo: null,
        donorId: null,
        donorName: "不明者",
        donorAddress: "東京都千代田区1-1",
        donorOccupation: "不明",
      },
    ];

    const section = PersonalDonationSection.fromTransactions(transactions);

    expect(section.totalAmount).toBe(60000);
    expect(section.sonotaGk).toBe(0);
    expect(section.rows).toHaveLength(1);
  });

  it("合計額の整合性: totalAmount === 明細行の合計 + sonotaGk", () => {
    const transactions: PersonalDonationTransaction[] = [
      {
        transactionNo: "1",
        transactionDate: new Date("2024-04-01"),
        debitAmount: 0,
        creditAmount: 30000,
        memo: null,
        donorId: "123",
        donorName: "田中太郎",
        donorAddress: "東京都千代田区1-1",
        donorOccupation: "会社員",
      },
      {
        transactionNo: "2",
        transactionDate: new Date("2024-06-15"),
        debitAmount: 0,
        creditAmount: 40000,
        memo: null,
        donorId: "123",
        donorName: "田中太郎",
        donorAddress: "東京都千代田区1-1",
        donorOccupation: "会社員",
      },
      {
        transactionNo: "3",
        transactionDate: new Date("2024-05-01"),
        debitAmount: 0,
        creditAmount: 25000,
        memo: null,
        donorId: "456",
        donorName: "鈴木花子",
        donorAddress: "大阪府大阪市1-1",
        donorOccupation: "自営業",
      },
    ];

    const section = PersonalDonationSection.fromTransactions(transactions);

    const rowsTotal = section.rows.reduce((sum, row) => sum + row.kingaku, 0);
    expect(section.totalAmount).toBe(rowsTotal + section.sonotaGk);
  });
});

describe("DONATION_DETAIL_THRESHOLD", () => {
  it("閾値は50000円", () => {
    expect(DONATION_DETAIL_THRESHOLD).toBe(50000);
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
