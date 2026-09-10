import {
  invalidResearchFundResult,
  RF_ERROR_CODES,
  type ResearchFundResult,
} from "@/server/contexts/research-fund/domain/types/validation";

export interface ResearchFundAccount {
  readonly key: string;
  readonly type: "asset" | "income" | "expense";
}

export interface JournalLine {
  readonly side: "debit" | "credit";
  readonly accountKey: string;
  readonly amount: number;
}

export interface JournalPosting {
  readonly lines: readonly JournalLine[];
}

type PostingInput = {
  amount: number;
  account: ResearchFundAccount;
  assetAccount: ResearchFundAccount;
} & (
  | { pattern: "expense"; source: "scan" | "manual" }
  | { pattern: "grant"; source: "grant" }
  | { pattern: "refund"; source: "manual" }
);

// 円の整数。永続化先の Decimal(12, 0) と同じ範囲に制限する。
function isValidAmount(amount: number): boolean {
  return Number.isSafeInteger(amount) && amount > 0 && amount <= 999_999_999_999;
}

export const JournalPosting = {
  generate(input: PostingInput): ResearchFundResult<JournalPosting> {
    const { pattern, source, amount, account, assetAccount } = input;
    if (
      !(
        (pattern === "expense" && (source === "scan" || source === "manual")) ||
        (pattern === "grant" && source === "grant") ||
        (pattern === "refund" && source === "manual")
      )
    ) {
      return invalidResearchFundResult(
        "pattern",
        RF_ERROR_CODES.INVALID_PATTERN,
        "仕訳パターンと入力元の組み合わせが不正です",
      );
    }
    if (!isValidAmount(amount)) {
      return invalidResearchFundResult(
        "amount",
        RF_ERROR_CODES.INVALID_AMOUNT,
        "金額は1円以上999999999999円以下の整数で指定してください",
      );
    }
    if (
      !account.key.trim() ||
      (pattern === "expense"
        ? account.type !== "expense" || ["bank", "cash", "grant-income"].includes(account.key)
        : account.type !== "income" || account.key !== "grant-income")
    ) {
      return invalidResearchFundResult(
        "account",
        RF_ERROR_CODES.INVALID_ACCOUNT,
        "支出には費用科目、支給・返還には調査研究費収入を指定してください",
      );
    }
    if (
      assetAccount.type !== "asset" ||
      (assetAccount.key !== "bank" && !(pattern === "expense" && assetAccount.key === "cash"))
    ) {
      return invalidResearchFundResult(
        "assetAccount",
        RF_ERROR_CODES.INVALID_ACCOUNT,
        "決済科目は普通預金（支出のみ現金も可）を指定してください",
      );
    }
    const debitAccount = pattern === "grant" ? assetAccount : account;
    const creditAccount = pattern === "grant" ? account : assetAccount;
    const lines = Object.freeze([
      Object.freeze({ side: "debit" as const, accountKey: debitAccount.key, amount }),
      Object.freeze({ side: "credit" as const, accountKey: creditAccount.key, amount }),
    ]);
    return { status: "valid", value: Object.freeze({ lines }) };
  },

  validate(lines: readonly JournalLine[]): ResearchFundResult<JournalPosting> {
    if (lines.length < 2) {
      return invalidResearchFundResult(
        "lines",
        RF_ERROR_CODES.INVALID_LINES,
        "仕訳には借方と貸方の行が必要です",
      );
    }
    let debit = BigInt(0);
    let credit = BigInt(0);
    for (const [index, line] of lines.entries()) {
      if (line.side !== "debit" && line.side !== "credit") {
        return invalidResearchFundResult(
          `lines.${index}.side`,
          RF_ERROR_CODES.INVALID_LINES,
          "借方または貸方を指定してください",
        );
      }
      if (!line.accountKey.trim()) {
        return invalidResearchFundResult(
          `lines.${index}.accountKey`,
          RF_ERROR_CODES.INVALID_ACCOUNT,
          "科目を指定してください",
        );
      }
      if (!isValidAmount(line.amount)) {
        return invalidResearchFundResult(
          `lines.${index}.amount`,
          RF_ERROR_CODES.INVALID_AMOUNT,
          "金額は1円以上999999999999円以下の整数で指定してください",
        );
      }
      if (line.side === "debit") debit += BigInt(line.amount);
      else credit += BigInt(line.amount);
    }
    if (debit !== credit) {
      return invalidResearchFundResult(
        "lines",
        RF_ERROR_CODES.UNBALANCED_POSTING,
        "借方合計と貸方合計が一致しません",
      );
    }
    return {
      status: "valid",
      value: Object.freeze({
        lines: Object.freeze(lines.map((line) => Object.freeze({ ...line }))),
      }),
    };
  },
};
