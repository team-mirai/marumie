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

  it("混在ケース: 5万円超と5万円以下の寄附者が混在（小計行あり）", () => {
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
    // 2件の明細行 + 1件の小計行 = 3行
    expect(section.rows).toHaveLength(3);
    expect(section.rows[0].kifusyaNm).toBe("田中太郎");
    expect(section.rows[0].kingaku).toBe(30000);
    expect(section.rows[1].kifusyaNm).toBe("田中太郎");
    expect(section.rows[1].kingaku).toBe(40000);
    // 小計行
    expect(section.rows[2].rowkbn).toBe("1");
    expect(section.rows[2].kifusyaNm).toBe("（小計）");
    expect(section.rows[2].kingaku).toBe(70000);
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

  it("同一者からの複数取引（5万円超）→ 複数の明細行 + 小計行", () => {
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
    // 3件の明細行 + 1件の小計行 = 4行
    expect(section.rows).toHaveLength(4);
    // 最後の行は小計行
    expect(section.rows[3].rowkbn).toBe("1");
    expect(section.rows[3].kifusyaNm).toBe("（小計）");
    expect(section.rows[3].kingaku).toBe(90000);
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

    // 明細行のみの合計（小計行は除外）
    const detailRowsTotal = section.rows
      .filter((row) => row.rowkbn === "0")
      .reduce((sum, row) => sum + row.kingaku, 0);
    expect(section.totalAmount).toBe(detailRowsTotal + section.sonotaGk);
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

  it("小計行（rowkbn=1）はバリデーション対象外", () => {
    const section = {
      totalAmount: 70000,
      sonotaGk: 0,
      rows: [
        {
          ichirenNo: "1",
          kifusyaNm: "山田太郎",
          kingaku: 30000,
          dt: new Date("2024-01-01"),
          adr: "東京都千代田区",
          syokugyo: "会社員",
          zeigakukoujyo: "0",
          rowkbn: "0",
        },
        {
          ichirenNo: "2",
          kifusyaNm: "山田太郎",
          kingaku: 40000,
          dt: new Date("2024-01-02"),
          adr: "東京都千代田区",
          syokugyo: "会社員",
          zeigakukoujyo: "0",
          rowkbn: "0",
        },
        {
          ichirenNo: "3",
          kifusyaNm: "（小計）",
          kingaku: 70000,
          dt: null, // 小計行は日付が空
          adr: "", // 小計行は住所が空
          syokugyo: "", // 小計行は職業が空
          zeigakukoujyo: "0",
          rowkbn: "1", // 小計行
        },
      ],
    };
    const errors = PersonalDonationSection.validate(section);

    // 小計行はバリデーション対象外なのでエラーなし
    expect(errors).toHaveLength(0);
  });
});

describe("PersonalDonationSection - 小計行生成", () => {
  it("同一寄附者から2件以上 → 小計行が生成される", () => {
    const transactions: PersonalDonationTransaction[] = [
      {
        transactionNo: "1",
        transactionDate: new Date("2024-01-01"),
        debitAmount: 0,
        creditAmount: 30000,
        memo: null,
        donorId: "donor1",
        donorName: "山田太郎",
        donorAddress: "東京都渋谷区",
        donorOccupation: "会社員",
      },
      {
        transactionNo: "2",
        transactionDate: new Date("2024-01-02"),
        debitAmount: 0,
        creditAmount: 40000,
        memo: null,
        donorId: "donor1",
        donorName: "山田太郎",
        donorAddress: "東京都渋谷区",
        donorOccupation: "会社員",
      },
    ];

    const section = PersonalDonationSection.fromTransactions(transactions);

    expect(section.rows).toHaveLength(3); // 2件明細 + 1件小計
    expect(section.rows[2].rowkbn).toBe("1");
    expect(section.rows[2].kifusyaNm).toBe("（小計）");
    expect(section.rows[2].kingaku).toBe(70000);
    expect(section.rows[2].dt).toBeNull();
    expect(section.rows[2].adr).toBe("");
    expect(section.rows[2].syokugyo).toBe("");
  });

  it("同一寄附者から1件のみ → 小計行なし", () => {
    const transactions: PersonalDonationTransaction[] = [
      {
        transactionNo: "1",
        transactionDate: new Date("2024-01-01"),
        debitAmount: 0,
        creditAmount: 60000,
        memo: null,
        donorId: "donor1",
        donorName: "山田太郎",
        donorAddress: "東京都渋谷区",
        donorOccupation: "会社員",
      },
    ];

    const section = PersonalDonationSection.fromTransactions(transactions);

    expect(section.rows).toHaveLength(1);
    expect(section.rows[0].rowkbn).toBe("0"); // 明細行のみ
    expect(section.rows.every((r) => r.rowkbn === "0")).toBe(true); // 小計行なし
  });

  it("複数の寄附者（2件以上と1件混在） → 該当グループのみ小計行あり", () => {
    const transactions: PersonalDonationTransaction[] = [
      // 寄附者A: 2件 → 小計行あり
      {
        transactionNo: "1",
        transactionDate: new Date("2024-01-01"),
        debitAmount: 0,
        creditAmount: 30000,
        memo: null,
        donorId: "donorA",
        donorName: "寄附者A",
        donorAddress: "東京都渋谷区",
        donorOccupation: "会社員",
      },
      {
        transactionNo: "2",
        transactionDate: new Date("2024-01-02"),
        debitAmount: 0,
        creditAmount: 30000,
        memo: null,
        donorId: "donorA",
        donorName: "寄附者A",
        donorAddress: "東京都渋谷区",
        donorOccupation: "会社員",
      },
      // 寄附者B: 1件 → 小計行なし
      {
        transactionNo: "3",
        transactionDate: new Date("2024-02-01"),
        debitAmount: 0,
        creditAmount: 60000,
        memo: null,
        donorId: "donorB",
        donorName: "寄附者B",
        donorAddress: "大阪府大阪市",
        donorOccupation: "自営業",
      },
    ];

    const section = PersonalDonationSection.fromTransactions(transactions);

    // 寄附者A: 2件明細 + 1件小計 = 3行
    // 寄附者B: 1件明細
    // 合計: 4行
    expect(section.rows).toHaveLength(4);

    // 小計行は1件のみ（寄附者Aのグループ）
    const subtotalRows = section.rows.filter((r) => r.rowkbn === "1");
    expect(subtotalRows).toHaveLength(1);
    expect(subtotalRows[0].kingaku).toBe(60000); // 寄附者Aの合計
  });

  it("一連番号が明細・小計通しで連番になっている", () => {
    const transactions: PersonalDonationTransaction[] = [
      {
        transactionNo: "1",
        transactionDate: new Date("2024-01-01"),
        debitAmount: 0,
        creditAmount: 30000,
        memo: null,
        donorId: "donor1",
        donorName: "山田太郎",
        donorAddress: "東京都渋谷区",
        donorOccupation: "会社員",
      },
      {
        transactionNo: "2",
        transactionDate: new Date("2024-01-02"),
        debitAmount: 0,
        creditAmount: 40000,
        memo: null,
        donorId: "donor1",
        donorName: "山田太郎",
        donorAddress: "東京都渋谷区",
        donorOccupation: "会社員",
      },
    ];

    const section = PersonalDonationSection.fromTransactions(transactions);

    expect(section.rows[0].ichirenNo).toBe("1");
    expect(section.rows[1].ichirenNo).toBe("2");
    expect(section.rows[2].ichirenNo).toBe("3"); // 小計行も連番
  });

  it("通し番号が同一グループで同じ値になっている", () => {
    const transactions: PersonalDonationTransaction[] = [
      // グループ1（寄附者A）
      {
        transactionNo: "1",
        transactionDate: new Date("2024-01-01"),
        debitAmount: 0,
        creditAmount: 30000,
        memo: null,
        donorId: "donorA",
        donorName: "寄附者A",
        donorAddress: "東京都渋谷区",
        donorOccupation: "会社員",
      },
      {
        transactionNo: "2",
        transactionDate: new Date("2024-01-02"),
        debitAmount: 0,
        creditAmount: 30000,
        memo: null,
        donorId: "donorA",
        donorName: "寄附者A",
        donorAddress: "東京都渋谷区",
        donorOccupation: "会社員",
      },
      // グループ2（寄附者B）
      {
        transactionNo: "3",
        transactionDate: new Date("2024-02-01"),
        debitAmount: 0,
        creditAmount: 40000,
        memo: null,
        donorId: "donorB",
        donorName: "寄附者B",
        donorAddress: "大阪府大阪市",
        donorOccupation: "自営業",
      },
      {
        transactionNo: "4",
        transactionDate: new Date("2024-02-02"),
        debitAmount: 0,
        creditAmount: 30000,
        memo: null,
        donorId: "donorB",
        donorName: "寄附者B",
        donorAddress: "大阪府大阪市",
        donorOccupation: "自営業",
      },
    ];

    const section = PersonalDonationSection.fromTransactions(transactions);

    // グループ1の行（seqNo = 1）
    expect(section.rows[0].seqNo).toBe("1");
    expect(section.rows[1].seqNo).toBe("1");
    expect(section.rows[2].seqNo).toBe("1"); // 小計行も同じseqNo

    // グループ2の行（seqNo = 2）
    expect(section.rows[3].seqNo).toBe("2");
    expect(section.rows[4].seqNo).toBe("2");
    expect(section.rows[5].seqNo).toBe("2"); // 小計行も同じseqNo
  });

  it("日付順にソートされている", () => {
    const transactions: PersonalDonationTransaction[] = [
      // 日付順がバラバラな入力
      {
        transactionNo: "3",
        transactionDate: new Date("2024-03-01"),
        debitAmount: 0,
        creditAmount: 10000,
        memo: null,
        donorId: "donor1",
        donorName: "山田太郎",
        donorAddress: "東京都渋谷区",
        donorOccupation: "会社員",
      },
      {
        transactionNo: "1",
        transactionDate: new Date("2024-01-01"),
        debitAmount: 0,
        creditAmount: 30000,
        memo: null,
        donorId: "donor1",
        donorName: "山田太郎",
        donorAddress: "東京都渋谷区",
        donorOccupation: "会社員",
      },
      {
        transactionNo: "2",
        transactionDate: new Date("2024-02-01"),
        debitAmount: 0,
        creditAmount: 20000,
        memo: null,
        donorId: "donor1",
        donorName: "山田太郎",
        donorAddress: "東京都渋谷区",
        donorOccupation: "会社員",
      },
    ];

    const section = PersonalDonationSection.fromTransactions(transactions);

    // 日付順にソートされている
    expect(section.rows[0].kingaku).toBe(30000); // 1月
    expect(section.rows[1].kingaku).toBe(20000); // 2月
    expect(section.rows[2].kingaku).toBe(10000); // 3月
    expect(section.rows[3].rowkbn).toBe("1"); // 小計行
  });

  it("合計金額に小計行が含まれていない", () => {
    const transactions: PersonalDonationTransaction[] = [
      {
        transactionNo: "1",
        transactionDate: new Date("2024-01-01"),
        debitAmount: 0,
        creditAmount: 30000,
        memo: null,
        donorId: "donor1",
        donorName: "山田太郎",
        donorAddress: "東京都渋谷区",
        donorOccupation: "会社員",
      },
      {
        transactionNo: "2",
        transactionDate: new Date("2024-01-02"),
        debitAmount: 0,
        creditAmount: 40000,
        memo: null,
        donorId: "donor1",
        donorName: "山田太郎",
        donorAddress: "東京都渋谷区",
        donorOccupation: "会社員",
      },
    ];

    const section = PersonalDonationSection.fromTransactions(transactions);

    // totalAmount は元のトランザクション合計（小計行は含まない）
    expect(section.totalAmount).toBe(70000);

    // 明細行のみの合計 + sonotaGk = totalAmount
    const detailRowsTotal = section.rows
      .filter((r) => r.rowkbn === "0")
      .reduce((sum, r) => sum + r.kingaku, 0);
    expect(detailRowsTotal + section.sonotaGk).toBe(section.totalAmount);
  });

  it("グループの並び順はグループ内最初の取引日付順", () => {
    const transactions: PersonalDonationTransaction[] = [
      // グループB（最初の取引日: 2024-02-01）
      {
        transactionNo: "1",
        transactionDate: new Date("2024-02-01"),
        debitAmount: 0,
        creditAmount: 30000,
        memo: null,
        donorId: "donorB",
        donorName: "寄附者B",
        donorAddress: "大阪府大阪市",
        donorOccupation: "自営業",
      },
      {
        transactionNo: "2",
        transactionDate: new Date("2024-02-15"),
        debitAmount: 0,
        creditAmount: 30000,
        memo: null,
        donorId: "donorB",
        donorName: "寄附者B",
        donorAddress: "大阪府大阪市",
        donorOccupation: "自営業",
      },
      // グループA（最初の取引日: 2024-01-01）
      {
        transactionNo: "3",
        transactionDate: new Date("2024-01-01"),
        debitAmount: 0,
        creditAmount: 40000,
        memo: null,
        donorId: "donorA",
        donorName: "寄附者A",
        donorAddress: "東京都渋谷区",
        donorOccupation: "会社員",
      },
      {
        transactionNo: "4",
        transactionDate: new Date("2024-01-15"),
        debitAmount: 0,
        creditAmount: 30000,
        memo: null,
        donorId: "donorA",
        donorName: "寄附者A",
        donorAddress: "東京都渋谷区",
        donorOccupation: "会社員",
      },
    ];

    const section = PersonalDonationSection.fromTransactions(transactions);

    // グループA（最初の取引日: 1月）が先に来る
    expect(section.rows[0].kifusyaNm).toBe("寄附者A");
    expect(section.rows[1].kifusyaNm).toBe("寄附者A");
    expect(section.rows[2].kifusyaNm).toBe("（小計）");

    // グループB（最初の取引日: 2月）が後に来る
    expect(section.rows[3].kifusyaNm).toBe("寄附者B");
    expect(section.rows[4].kifusyaNm).toBe("寄附者B");
    expect(section.rows[5].kifusyaNm).toBe("（小計）");
  });

  it("小計行の金額は明細行の丸め後金額の合計と一致する（丸め誤差対策）", () => {
    // 小数点以下の金額を持つトランザクション（丸め誤差が発生しやすいケース）
    const transactions: PersonalDonationTransaction[] = [
      {
        transactionNo: "1",
        transactionDate: new Date("2024-01-01"),
        debitAmount: 0,
        creditAmount: 30000.6, // 丸めると30001
        memo: null,
        donorId: "donor1",
        donorName: "山田太郎",
        donorAddress: "東京都渋谷区",
        donorOccupation: "会社員",
      },
      {
        transactionNo: "2",
        transactionDate: new Date("2024-01-02"),
        debitAmount: 0,
        creditAmount: 30000.6, // 丸めると30001
        memo: null,
        donorId: "donor1",
        donorName: "山田太郎",
        donorAddress: "東京都渋谷区",
        donorOccupation: "会社員",
      },
    ];

    const section = PersonalDonationSection.fromTransactions(transactions);

    // 明細行の金額
    const detailRows = section.rows.filter((r) => r.rowkbn === "0");
    expect(detailRows[0].kingaku).toBe(30001);
    expect(detailRows[1].kingaku).toBe(30001);

    // 小計行の金額は明細行の合計と一致する（60002、not 60001）
    const subtotalRow = section.rows.find((r) => r.rowkbn === "1");
    expect(subtotalRow?.kingaku).toBe(60002);

    // 明細行の合計と小計行の金額が一致することを確認
    const sumOfDetailRows = detailRows.reduce((sum, r) => sum + r.kingaku, 0);
    expect(subtotalRow?.kingaku).toBe(sumOfDetailRows);
  });
});
