import {
  MfJournal,
  type MfJournalInput,
} from "@/server/contexts/data-import/domain/models/mf-journal";
import { PreviewTransaction } from "@/server/contexts/data-import/domain/models/preview-transaction";

describe("MfJournal", () => {
  describe("classify", () => {
    describe("現金主義（現金類と PL 科目の仕訳）", () => {
      it.each([
        ["普通預金", "個人からの寄附", "income", "individual-donations"],
        ["現金", "個人からの寄附", "income", "individual-donations"],
        ["事務所費", "普通預金", "expense", "office-expenses"],
        ["事務所費", "現金", "expense", "office-expenses"],
      ])("借方 %s / 貸方 %s は %s（%s）", (debit, credit, type, categoryKey) => {
        expect(MfJournal.classify(debit, credit)).toEqual({
          transactionType: type,
          categoryKey,
        });
      });
    });

    describe("発生主義（現金類でない BS 科目と PL 科目の仕訳）", () => {
      it.each([
        ["事務所費", "未払費用", "expense"],
        ["備品・消耗品費", "未払金", "expense"],
        ["事務所費", "仮払金", "expense"],
        ["事務所費", "立替金", "expense"],
        ["仮受金", "個人からの寄附", "income"],
        ["未収入金", "個人からの寄附", "income"],
        // 貸方に支出科目が来る反対取引（未払・仮払の精算）は支出のまま
        ["未払費用", "宣伝事業費", "expense"],
        ["仮払金", "事務所費", "expense"],
      ])("借方 %s / 貸方 %s は %s", (debit, credit, type) => {
        expect(MfJournal.classify(debit, credit).transactionType).toBe(type);
      });

      it("カテゴリは PL 科目から決まる", () => {
        expect(MfJournal.classify("未払費用", "宣伝事業費").categoryKey).toBe(
          MfJournal.classify("宣伝事業費", "普通預金").categoryKey,
        );
      });
    });

    describe("相殺", () => {
      it("借方が相殺項目（費用）なら相殺の支出", () => {
        expect(MfJournal.classify("相殺項目（費用）", "事務所費")).toEqual({
          transactionType: "offset_expense",
          categoryKey: "office-expenses",
        });
      });

      it("貸方が相殺項目（収入）なら相殺の収入", () => {
        expect(MfJournal.classify("個人からの寄附", "相殺項目（収入）")).toEqual({
          transactionType: "offset_income",
          categoryKey: "individual-donations",
        });
      });
    });

    describe("現金の動かない仕訳（BS 科目どうし）", () => {
      it.each([
        ["未払費用", "普通預金"],
        ["普通預金", "未収入金"],
        ["仮払金", "未払費用"],
      ])("借方 %s / 貸方 %s は non_cash_journal でカテゴリなし", (debit, credit) => {
        expect(MfJournal.classify(debit, credit)).toEqual({
          transactionType: "non_cash_journal",
          categoryKey: "undefined",
        });
      });
    });

    describe("分類できない組み合わせ", () => {
      it.each([
        ["事務所費", "個人からの寄附"],
        ["事務所費", "未払金/未払費用"],
        ["テスト借方", "テスト貸方"],
      ])("借方 %s / 貸方 %s は null", (debit, credit) => {
        expect(MfJournal.classify(debit, credit).transactionType).toBeNull();
      });
    });
  });

  describe("isOffset", () => {
    it("借方の相殺項目（費用）か貸方の相殺項目（収入）なら相殺の仕訳", () => {
      expect(MfJournal.isOffset("相殺項目（費用）", "事務所費")).toBe(true);
      expect(MfJournal.isOffset("個人からの寄附", "相殺項目（収入）")).toBe(true);
      expect(MfJournal.isOffset("事務所費", "普通預金")).toBe(false);
    });
  });

  describe("isKnownAccount", () => {
    it.each(["事務所費", "個人からの寄附", "普通預金", "未払費用", "相殺項目（費用）", "相殺項目（収入）"])(
      "%s は取り込める科目",
      (account) => {
        expect(MfJournal.isKnownAccount(account)).toBe(true);
      },
    );

    it.each(["未払金/未払費用", "テスト科目", ""])("%s は取り込めない科目", (account) => {
      expect(MfJournal.isKnownAccount(account)).toBe(false);
    });
  });

  describe("toPreviewTransaction", () => {
    const createInput = (overrides: Partial<MfJournalInput> = {}): MfJournalInput => ({
      politicalOrganizationId: "org-1",
      transactionNo: "1",
      transactionDate: new Date("2025/06/06"),
      rawTransactionDate: "2025/06/06",
      debit: { account: "普通預金", subAccount: "テスト銀行", amount: 1000, rawAmount: "1000" },
      credit: { account: "個人からの寄附", subAccount: undefined, amount: 1000, rawAmount: "1000" },
      description: "振込",
      label: undefined,
      friendlyCategory: "寄附",
      ...overrides,
    });

    it("分類した取引種別とカテゴリを持つ insert の取引にし、ハッシュを付ける", () => {
      const result = MfJournal.toPreviewTransaction(createInput());

      expect(result).toMatchObject({
        political_organization_id: "org-1",
        transaction_no: "1",
        transaction_date: new Date("2025/06/06"),
        transaction_type: "income",
        category_key: "individual-donations",
        debit_sub_account: "テスト銀行",
        debit_amount: 1000,
        credit_amount: 1000,
        friendly_category: "寄附",
        status: "insert",
        errors: [],
      });
      expect(result.hash).toBe(PreviewTransaction.generateHash(result));
    });

    it("分類できない科目の組み合わせは理由つきで無効にする", () => {
      const result = MfJournal.toPreviewTransaction(
        createInput({
          debit: { account: "事務所費", subAccount: undefined, amount: 1000, rawAmount: "1000" },
        }),
      );

      expect(result.status).toBe("invalid");
      expect(result.transaction_type).toBeNull();
      expect(result.errors).toEqual([
        "Invalid account combination: debit=事務所費, credit=個人からの寄附",
      ]);
    });

    it("解釈できない取引日は理由つきで無効にする", () => {
      const result = MfJournal.toPreviewTransaction(
        createInput({ transactionDate: null, rawTransactionDate: "2025/13/45" }),
      );

      expect(result.status).toBe("invalid");
      expect(result.errors).toEqual(["Invalid date format: 2025/13/45"]);
    });

    it("解釈できない金額は理由つきで無効にする", () => {
      const result = MfJournal.toPreviewTransaction(
        createInput({
          debit: { account: "普通預金", subAccount: undefined, amount: null, rawAmount: "abc" },
          credit: { account: "個人からの寄附", subAccount: undefined, amount: null, rawAmount: "" },
        }),
      );

      expect(result.status).toBe("invalid");
      expect(result.errors).toEqual([
        '借方金額を解釈できません: "abc"',
        '貸方金額を解釈できません: ""',
      ]);
    });
  });

  describe("fromReturnedPreview", () => {
    const original = MfJournal.toPreviewTransaction({
      politicalOrganizationId: "1",
      transactionNo: "1",
      transactionDate: new Date("2025/06/06"),
      rawTransactionDate: "2025/06/06",
      debit: { account: "普通預金", subAccount: "テスト銀行", amount: 1000, rawAmount: "1000" },
      credit: { account: "個人からの寄附", subAccount: undefined, amount: 1000, rawAmount: "1000" },
      description: "振込",
      label: "振込",
      friendlyCategory: "寄附",
    });

    it("書き換えられていない行は、プレビューと同じ取引に組み立て直す", () => {
      expect(MfJournal.fromReturnedPreview(original, "1")).toEqual(original);
    });

    it("送られてきた取引種別・カテゴリ・ハッシュ・団体は使わず、科目と内容から計算し直す", () => {
      const result = MfJournal.fromReturnedPreview(
        {
          ...original,
          political_organization_id: "999",
          transaction_type: "expense",
          category_key: "office-expenses",
          hash: "tampered-hash",
        },
        "1",
      );

      expect(result.political_organization_id).toBe("1");
      expect(result.transaction_type).toBe("income");
      expect(result.category_key).toBe("individual-donations");
      expect(result.hash).toBe(original.hash);
    });

    it("無効と判定された行は、状態を書き換えられても無効に戻す", () => {
      const invalid = MfJournal.toPreviewTransaction({
        politicalOrganizationId: "1",
        transactionNo: "2",
        transactionDate: new Date("2025/06/06"),
        rawTransactionDate: "2025/06/06",
        debit: { account: "事務所費", subAccount: undefined, amount: 1000, rawAmount: "1000" },
        credit: { account: "個人からの寄附", subAccount: undefined, amount: 1000, rawAmount: "1000" },
        description: undefined,
        label: undefined,
        friendlyCategory: "寄附",
      });

      const result = MfJournal.fromReturnedPreview(
        { ...invalid, status: "insert", errors: [], transaction_type: "expense" },
        "1",
      );

      expect(result.status).toBe("invalid");
      expect(result.transaction_type).toBeNull();
    });

    it("日付や金額として解釈できない値が送られてきた行は無効にする", () => {
      const result = MfJournal.fromReturnedPreview(
        {
          ...original,
          transaction_date: "not-a-date" as unknown as Date,
          debit_amount: Number.NaN,
          credit_amount: "1000" as unknown as number,
        },
        "1",
      );

      expect(result.status).toBe("invalid");
      expect(result.errors).toEqual([
        "Invalid date format: not-a-date",
        '借方金額を解釈できません: "NaN"',
        '貸方金額を解釈できません: "1000"',
      ]);
    });
  });
});
