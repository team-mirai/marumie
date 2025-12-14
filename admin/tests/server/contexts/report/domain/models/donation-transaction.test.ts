import {
  PersonalDonationSection,
  type PersonalDonationTransaction,
} from "@/server/contexts/report/domain/models/donation-transaction";

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
