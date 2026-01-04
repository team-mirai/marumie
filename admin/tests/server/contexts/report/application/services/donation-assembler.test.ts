import {
  DonationAssembler,
  type DonationAssemblerInput,
} from "@/server/contexts/report/application/services/donation-assembler";
import type { IReportTransactionRepository } from "@/server/contexts/report/domain/repositories/report-transaction-repository.interface";
import type { PersonalDonationTransaction } from "@/server/contexts/report/domain/models/donation-transaction";

describe("DonationAssembler", () => {
  let assembler: DonationAssembler;
  let mockRepository: jest.Mocked<IReportTransactionRepository>;

  const defaultInput: DonationAssemblerInput = {
    politicalOrganizationId: "org-123",
    financialYear: 2024,
  };

  beforeEach(() => {
        mockRepository = {
          findPersonalDonationTransactions: jest.fn(),
          findBusinessIncomeTransactions: jest.fn(),
          findLoanIncomeTransactions: jest.fn(),
          findGrantIncomeTransactions: jest.fn(),
          findOtherIncomeTransactions: jest.fn(),
          findUtilityExpenseTransactions: jest.fn(),
          findSuppliesExpenseTransactions: jest.fn(),
          findOfficeExpenseTransactions: jest.fn(),
          findOrganizationExpenseTransactions: jest.fn(),
          findElectionExpenseTransactions: jest.fn(),
          findPublicationExpenseTransactions: jest.fn(),
          findAdvertisingExpenseTransactions: jest.fn(),
          findFundraisingPartyExpenseTransactions: jest.fn(),
          findOtherBusinessExpenseTransactions: jest.fn(),
          findResearchExpenseTransactions: jest.fn(),
          findDonationGrantExpenseTransactions: jest.fn(),
          findOtherPoliticalExpenseTransactions: jest.fn(),
          findPersonnelExpenseTransactions: jest.fn(),
          findTransactionsWithCounterparts: jest.fn(),
          findByCounterpart: jest.fn(),
          existsById: jest.fn(),
          findExistingIds: jest.fn(),
          findByIdWithCounterpart: jest.fn(),
          updateGrantExpenditureFlag: jest.fn(),
        };
    assembler = new DonationAssembler(mockRepository);
  });

  describe("リポジトリへのフィルター受け渡し", () => {
    it("正しいフィルターを渡す", async () => {
      mockRepository.findPersonalDonationTransactions.mockResolvedValue([]);

      const input: DonationAssemblerInput = {
        politicalOrganizationId: "org-456",
        financialYear: 2023,
      };

      await assembler.assemble(input);

      expect(mockRepository.findPersonalDonationTransactions).toHaveBeenCalledWith({
        politicalOrganizationId: "org-456",
        financialYear: 2023,
      });
    });
  });

  describe("セクション構築の委譲", () => {
    it("取得したトランザクションを個人寄附セクションに正しく委譲する", async () => {
      const transactions: PersonalDonationTransaction[] = [
        createDonationTransaction({ debitAmount: 100000 }),
        createDonationTransaction({ debitAmount: 50000 }),
      ];
      mockRepository.findPersonalDonationTransactions.mockResolvedValue(transactions);

      const result = await assembler.assemble(defaultInput);

      expect(result.personalDonations.totalAmount).toBe(150000);
      // 同一寄附者から2件 → 2件明細 + 1件小計 = 3行
      expect(result.personalDonations.rows).toHaveLength(3);
      expect(result.personalDonations.rows[2].rowkbn).toBe("1"); // 小計行
      expect(result.personalDonations.rows[2].kifusyaNm).toBe("（小計）");
    });

    it("空のトランザクションの場合は空のセクションを返す", async () => {
      mockRepository.findPersonalDonationTransactions.mockResolvedValue([]);

      const result = await assembler.assemble(defaultInput);

      expect(result.personalDonations.totalAmount).toBe(0);
      expect(result.personalDonations.rows).toHaveLength(0);
      expect(result.personalDonations.sonotaGk).toBe(0);
    });

    it("DonationDataの全プロパティを含む結果を返す", async () => {
      mockRepository.findPersonalDonationTransactions.mockResolvedValue([]);

      const result = await assembler.assemble(defaultInput);

      expect(result).toHaveProperty("personalDonations");
      expect(result.personalDonations).toHaveProperty("totalAmount");
      expect(result.personalDonations).toHaveProperty("sonotaGk");
      expect(result.personalDonations).toHaveProperty("rows");
    });
  });

  describe("リポジトリエラーの伝播", () => {
    it("リポジトリがエラーを投げた場合は例外を伝播する", async () => {
      const error = new Error("Database connection failed");
      mockRepository.findPersonalDonationTransactions.mockRejectedValue(error);

      await expect(assembler.assemble(defaultInput)).rejects.toThrow("Database connection failed");
    });
  });

  describe("小計行生成の統合テスト", () => {
    it("グループ内の取引を日付順にソートする", async () => {
      const transactions: PersonalDonationTransaction[] = [
        createDonationTransaction({
          transactionNo: "TX-003",
          transactionDate: new Date("2024-06-15"),
          debitAmount: 30000,
        }),
        createDonationTransaction({
          transactionNo: "TX-001",
          transactionDate: new Date("2024-04-01"),
          debitAmount: 40000,
        }),
        createDonationTransaction({
          transactionNo: "TX-002",
          transactionDate: new Date("2024-05-10"),
          debitAmount: 20000,
        }),
      ];
      mockRepository.findPersonalDonationTransactions.mockResolvedValue(transactions);

      const result = await assembler.assemble(defaultInput);

      // 3件明細 + 1件小計 = 4行
      expect(result.personalDonations.rows).toHaveLength(4);
      // 日付順にソートされていることを確認
      const detailRows = result.personalDonations.rows.filter((r) => r.rowkbn === "0");
      expect(detailRows[0].dt).toEqual(new Date("2024-04-01"));
      expect(detailRows[1].dt).toEqual(new Date("2024-05-10"));
      expect(detailRows[2].dt).toEqual(new Date("2024-06-15"));
    });

    it("同一寄附者グループに同じseqNoを付与する", async () => {
      const transactions: PersonalDonationTransaction[] = [
        createDonationTransaction({
          donorId: "donor-A",
          debitAmount: 30000,
          donorName: "寄附者A",
        }),
        createDonationTransaction({
          donorId: "donor-A",
          debitAmount: 30000,
          donorName: "寄附者A",
        }),
      ];
      mockRepository.findPersonalDonationTransactions.mockResolvedValue(transactions);

      const result = await assembler.assemble(defaultInput);

      // 全行が同じseqNoを持つ
      const allRows = result.personalDonations.rows;
      expect(allRows).toHaveLength(3); // 2明細 + 1小計
      expect(allRows[0].seqNo).toBe("1");
      expect(allRows[1].seqNo).toBe("1");
      expect(allRows[2].seqNo).toBe("1"); // 小計行も同じseqNo
    });

    it("複数グループに連番でseqNoを付与する", async () => {
      const transactions: PersonalDonationTransaction[] = [
        createDonationTransaction({
          donorId: "donor-A",
          transactionDate: new Date("2024-04-01"),
          debitAmount: 30000,
          donorName: "寄附者A",
        }),
        createDonationTransaction({
          donorId: "donor-A",
          transactionDate: new Date("2024-04-15"),
          debitAmount: 30000,
          donorName: "寄附者A",
        }),
        createDonationTransaction({
          donorId: "donor-B",
          transactionDate: new Date("2024-05-01"),
          debitAmount: 60000,
          donorName: "寄附者B",
        }),
      ];
      mockRepository.findPersonalDonationTransactions.mockResolvedValue(transactions);

      const result = await assembler.assemble(defaultInput);

      // donor-A: 2明細 + 1小計, donor-B: 1明細 = 4行
      expect(result.personalDonations.rows).toHaveLength(4);
      // 最初のグループ（donor-A）はseqNo=1
      expect(result.personalDonations.rows[0].seqNo).toBe("1");
      expect(result.personalDonations.rows[1].seqNo).toBe("1");
      expect(result.personalDonations.rows[2].seqNo).toBe("1"); // 小計行
      // 次のグループ（donor-B）はseqNo=2
      expect(result.personalDonations.rows[3].seqNo).toBe("2");
    });

    it("ichirenNoが全行に連番で付与される", async () => {
      const transactions: PersonalDonationTransaction[] = [
        createDonationTransaction({
          donorId: "donor-A",
          transactionDate: new Date("2024-04-01"),
          debitAmount: 30000,
        }),
        createDonationTransaction({
          donorId: "donor-A",
          transactionDate: new Date("2024-04-15"),
          debitAmount: 30000,
        }),
      ];
      mockRepository.findPersonalDonationTransactions.mockResolvedValue(transactions);

      const result = await assembler.assemble(defaultInput);

      // 2明細 + 1小計 = 3行
      expect(result.personalDonations.rows).toHaveLength(3);
      expect(result.personalDonations.rows[0].ichirenNo).toBe("1");
      expect(result.personalDonations.rows[1].ichirenNo).toBe("2");
      expect(result.personalDonations.rows[2].ichirenNo).toBe("3"); // 小計行にも連番
    });

    it("グループを最初の取引日付順でソートする", async () => {
      const transactions: PersonalDonationTransaction[] = [
        // donor-B: 最初の取引が5月
        createDonationTransaction({
          donorId: "donor-B",
          transactionDate: new Date("2024-05-01"),
          debitAmount: 60000,
          donorName: "寄附者B",
        }),
        // donor-A: 最初の取引が4月
        createDonationTransaction({
          donorId: "donor-A",
          transactionDate: new Date("2024-04-01"),
          debitAmount: 30000,
          donorName: "寄附者A",
        }),
        createDonationTransaction({
          donorId: "donor-A",
          transactionDate: new Date("2024-06-01"),
          debitAmount: 30000,
          donorName: "寄附者A",
        }),
      ];
      mockRepository.findPersonalDonationTransactions.mockResolvedValue(transactions);

      const result = await assembler.assemble(defaultInput);

      // donor-A（4月）が先、donor-B（5月）が後
      const rows = result.personalDonations.rows;
      expect(rows[0].kifusyaNm).toBe("寄附者A");
      expect(rows[1].kifusyaNm).toBe("寄附者A");
      expect(rows[2].kifusyaNm).toBe("（小計）"); // donor-Aの小計
      expect(rows[3].kifusyaNm).toBe("寄附者B");
    });

    it("単一取引の寄附者には小計行を生成しない", async () => {
      const transactions: PersonalDonationTransaction[] = [
        createDonationTransaction({
          donorId: "donor-A",
          debitAmount: 60000,
          donorName: "寄附者A",
        }),
      ];
      mockRepository.findPersonalDonationTransactions.mockResolvedValue(transactions);

      const result = await assembler.assemble(defaultInput);

      // 1件のみ → 小計行なし
      expect(result.personalDonations.rows).toHaveLength(1);
      expect(result.personalDonations.rows[0].rowkbn).toBe("0"); // 明細行
      expect(result.personalDonations.rows[0].kifusyaNm).toBe("寄附者A");
    });

    it("小計行のdtがnullである", async () => {
      const transactions: PersonalDonationTransaction[] = [
        createDonationTransaction({
          transactionDate: new Date("2024-04-01"),
          debitAmount: 50000,
        }),
        createDonationTransaction({
          transactionDate: new Date("2024-05-01"),
          debitAmount: 50000,
        }),
      ];
      mockRepository.findPersonalDonationTransactions.mockResolvedValue(transactions);

      const result = await assembler.assemble(defaultInput);

      // 小計行を取得
      const subtotalRow = result.personalDonations.rows.find((r) => r.rowkbn === "1");
      expect(subtotalRow).toBeDefined();
      expect(subtotalRow?.dt).toBeNull();
      // 明細行はdtが設定されている
      const detailRows = result.personalDonations.rows.filter((r) => r.rowkbn === "0");
      detailRows.forEach((row) => {
        expect(row.dt).not.toBeNull();
      });
    });

    it("小計行の住所・職業・備考が空文字である", async () => {
      const transactions: PersonalDonationTransaction[] = [
        createDonationTransaction({
          debitAmount: 50000,
          donorAddress: "東京都渋谷区",
          donorOccupation: "会社役員",
          memo: "備考あり",
        }),
        createDonationTransaction({
          debitAmount: 50000,
          donorAddress: "東京都新宿区",
          donorOccupation: "自営業",
          memo: "別の備考",
        }),
      ];
      mockRepository.findPersonalDonationTransactions.mockResolvedValue(transactions);

      const result = await assembler.assemble(defaultInput);

      const subtotalRow = result.personalDonations.rows.find((r) => r.rowkbn === "1");
      expect(subtotalRow).toBeDefined();
      expect(subtotalRow?.adr).toBe("");
      expect(subtotalRow?.syokugyo).toBe("");
      expect(subtotalRow?.bikou).toBe("");
    });

    it("小計行の金額がグループ内合計と一致する", async () => {
      const transactions: PersonalDonationTransaction[] = [
        createDonationTransaction({ debitAmount: 30000 }),
        createDonationTransaction({ debitAmount: 45000 }),
        createDonationTransaction({ debitAmount: 25000 }),
      ];
      mockRepository.findPersonalDonationTransactions.mockResolvedValue(transactions);

      const result = await assembler.assemble(defaultInput);

      const subtotalRow = result.personalDonations.rows.find((r) => r.rowkbn === "1");
      expect(subtotalRow).toBeDefined();
      expect(subtotalRow?.kingaku).toBe(100000); // 30000 + 45000 + 25000
    });
  });
});

function createDonationTransaction(
  overrides: Partial<PersonalDonationTransaction> = {},
): PersonalDonationTransaction {
  return {
    transactionNo: "TX-001",
    transactionDate: new Date("2024-04-01"),
    debitAmount: 0,
    creditAmount: 0,
    memo: null,
    donorId: "donor-001",
    donorName: "テスト寄附者",
    donorAddress: "東京都千代田区",
    donorOccupation: "会社員",
    ...overrides,
  };
}
