import { resolveCategoryPill, resolveCategoryPillByKey } from "@/client/lib/category-pill";
import { PL_CATEGORIES } from "@/shared/accounting/account-category";

const INCOME_ACCOUNT = "個人からの寄附";
const EXPENSE_ACCOUNT = Object.keys(PL_CATEGORIES).find(
  (key) => PL_CATEGORIES[key].type === "expense",
) as string;

describe("resolveCategoryPill", () => {
  it("収入は背景と枠がカテゴリ色・文字 #47474C になる", () => {
    const mapping = PL_CATEGORIES[INCOME_ACCOUNT];
    const pill = resolveCategoryPill({
      debit_account: "普通預金",
      credit_account: INCOME_ACCOUNT,
      transaction_type: "income",
    });

    expect(pill).toEqual({
      label: mapping.shortLabel,
      fontColor: "#47474C",
      borderColor: mapping.color,
      bgColor: mapping.color,
    });
  });

  it("支出は背景白・枠と文字がカテゴリ色になる", () => {
    const mapping = PL_CATEGORIES[EXPENSE_ACCOUNT];
    const pill = resolveCategoryPill({
      debit_account: EXPENSE_ACCOUNT,
      credit_account: "普通預金",
      transaction_type: "expense",
    });

    expect(pill).toEqual({
      label: mapping.shortLabel,
      fontColor: mapping.color,
      borderColor: mapping.color,
      bgColor: "#FFFFFF",
    });
  });

  it("非現金仕訳は背景白・枠 #CCC・文字 #666・ラベル「-」になる", () => {
    const pill = resolveCategoryPill({
      debit_account: EXPENSE_ACCOUNT,
      credit_account: INCOME_ACCOUNT,
      transaction_type: "non_cash_journal",
    });

    expect(pill).toEqual({
      label: "-",
      fontColor: "#666666",
      borderColor: "#CCCCCC",
      bgColor: "#FFFFFF",
    });
  });

  it("相殺収入は貸方の勘定科目でカテゴリを決める", () => {
    const pill = resolveCategoryPill({
      debit_account: EXPENSE_ACCOUNT,
      credit_account: INCOME_ACCOUNT,
      transaction_type: "offset_income",
    });

    expect(pill.label).toBe(PL_CATEGORIES[INCOME_ACCOUNT].shortLabel);
  });

  it("相殺支出は借方の勘定科目でカテゴリを決める", () => {
    const pill = resolveCategoryPill({
      debit_account: EXPENSE_ACCOUNT,
      credit_account: INCOME_ACCOUNT,
      transaction_type: "offset_expense",
    });

    expect(pill.label).toBe(PL_CATEGORIES[EXPENSE_ACCOUNT].shortLabel);
  });

  it("PL_CATEGORIES に無い勘定科目は科目名をラベルにしフォールバック色を使う", () => {
    const income = resolveCategoryPill({
      debit_account: "普通預金",
      credit_account: "未知の科目",
      transaction_type: "income",
    });
    expect(income).toEqual({
      label: "未知の科目",
      fontColor: "#47474C",
      borderColor: "#99F6E4",
      bgColor: "#99F6E4",
    });

    // 借方が費用系でない場合は貸方の科目を採用する（従来の判定ルールを維持）
    const expense = resolveCategoryPill({
      debit_account: "未知の費用",
      credit_account: "未知の科目",
      transaction_type: "expense",
    });
    expect(expense).toEqual({
      label: "未知の科目",
      fontColor: "#47474C",
      borderColor: "#99F6E4",
      bgColor: "#FFFFFF",
    });
  });

  it("transaction_type が null（プレビューの無効行）でも落ちずに貸方で判定する", () => {
    const pill = resolveCategoryPill({
      debit_account: "普通預金",
      credit_account: INCOME_ACCOUNT,
      transaction_type: null,
    });

    expect(pill.label).toBe(PL_CATEGORIES[INCOME_ACCOUNT].shortLabel);
    expect(pill.bgColor).toBe(PL_CATEGORIES[INCOME_ACCOUNT].color);
  });
});

describe("resolveCategoryPillByKey", () => {
  it("収入カテゴリのキーは resolveCategoryPill の収入ルールと同じピルになる", () => {
    const mapping = PL_CATEGORIES[INCOME_ACCOUNT];
    expect(resolveCategoryPillByKey(mapping.key)).toEqual(
      resolveCategoryPill({
        debit_account: "普通預金",
        credit_account: INCOME_ACCOUNT,
        transaction_type: "income",
      }),
    );
  });

  it("支出カテゴリのキーは resolveCategoryPill の支出ルールと同じピルになる", () => {
    const mapping = PL_CATEGORIES[EXPENSE_ACCOUNT];
    expect(resolveCategoryPillByKey(mapping.key)).toEqual(
      resolveCategoryPill({
        debit_account: EXPENSE_ACCOUNT,
        credit_account: "普通預金",
        transaction_type: "expense",
      }),
    );
  });

  it("未知のキーはキー文字列をラベルにしたフォールバック色（白地）で返す", () => {
    expect(resolveCategoryPillByKey("unknown-key")).toEqual({
      label: "unknown-key",
      fontColor: "#47474C",
      borderColor: "#99F6E4",
      bgColor: "#FFFFFF",
    });
  });
});
