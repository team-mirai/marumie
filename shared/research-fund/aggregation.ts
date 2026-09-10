/** 公開範囲・年度・議員の絞り込みと複式仕訳からの射影は呼び出し側で行う。 */
export interface ResearchFundRow {
  /** 帳簿上の日付（YYYY-MM-DD）。タイムゾーンによる月のずれを避ける。 */
  readonly date: string;
  readonly accountKey: string;
  readonly amount: number;
  readonly type: "grant" | "expense";
}

export interface ResearchFundCategory {
  readonly label: string;
  readonly legalLabel: string;
}

export interface ResearchFundCategoryTotal {
  /** 法定区分では legalLabel をキーに統合する。未使用とは kind で区別する。 */
  key: string;
  label: string;
  kind: "expense" | "unused";
  totalAmount: number;
}

export interface ResearchFundAggregation {
  /** 費目はキー順、未使用は0円・負数の場合も常に末尾。 */
  categories: ResearchFundCategoryTotal[];
  /** 入力に存在する月のみを年月の昇順で返す。未公開月は補完しない。 */
  monthly: { month: string; granted: number; spent: number }[];
  kpi: { granted: number; spent: number };
  unused: number;
}

const ERROR_CODES = {
  INVALID_DATE: "RF_AGGREGATION_INVALID_DATE",
  INVALID_AMOUNT: "RF_AGGREGATION_INVALID_AMOUNT",
  INVALID_TYPE: "RF_AGGREGATION_INVALID_TYPE",
  MISSING_CATEGORY: "RF_AGGREGATION_MISSING_CATEGORY",
  UNSAFE_TOTAL: "RF_AGGREGATION_UNSAFE_TOTAL",
} as const;

export interface ResearchFundAggregationError {
  path: string;
  code: (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
  message: string;
  severity: "error";
}

export type ResearchFundAggregationResult =
  | { status: "valid"; value: ResearchFundAggregation }
  | { status: "invalid"; errors: ResearchFundAggregationError[] };

function invalid(
  path: string,
  code: ResearchFundAggregationError["code"],
  message: string,
): ResearchFundAggregationResult {
  return { status: "invalid", errors: [{ path, code, message, severity: "error" }] };
}

/** DB・アプリ固有の型に依存しない、公開ページと公開プレビュー共通の集計。 */
export function aggregateResearchFund(
  rows: readonly ResearchFundRow[],
  accounts: Readonly<Record<string, ResearchFundCategory>>,
  mode: "detailed" | "legal" = "detailed",
): ResearchFundAggregationResult {
  const categories = new Map<string, ResearchFundCategoryTotal>();
  const monthly = new Map<string, { month: string; granted: number; spent: number }>();
  let granted = 0;
  let spent = 0;

  for (const [index, row] of rows.entries()) {
    const path = `rows.${index}`;
    const timestamp = Date.parse(`${row.date}T00:00:00.000Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(row.date) ||
      !Number.isFinite(timestamp) ||
      new Date(timestamp).toISOString().slice(0, 10) !== row.date
    ) {
      return invalid(
        `${path}.date`,
        ERROR_CODES.INVALID_DATE,
        "日付は実在するYYYY-MM-DDで指定してください",
      );
    }
    if (!Number.isSafeInteger(row.amount) || row.amount < 0) {
      return invalid(
        `${path}.amount`,
        ERROR_CODES.INVALID_AMOUNT,
        "金額は安全な範囲の0以上の整数円で指定してください",
      );
    }
    if (row.type !== "grant" && row.type !== "expense") {
      return invalid(`${path}.type`, ERROR_CODES.INVALID_TYPE, "支給または支出を指定してください");
    }

    const month = row.date.slice(0, 7);
    const monthTotal = monthly.get(month) ?? { month, granted: 0, spent: 0 };
    if (row.type === "grant") {
      granted += row.amount;
      monthTotal.granted += row.amount;
    } else {
      const account = Object.prototype.hasOwnProperty.call(accounts, row.accountKey)
        ? accounts[row.accountKey]
        : undefined;
      if (!account?.label.trim() || (mode === "legal" && !account.legalLabel?.trim())) {
        return invalid(
          `${path}.accountKey`,
          ERROR_CODES.MISSING_CATEGORY,
          "支出科目の区分対応が見つかりません",
        );
      }
      const key = mode === "legal" ? account.legalLabel : row.accountKey;
      const category = categories.get(key) ?? {
        key,
        label: mode === "legal" ? account.legalLabel : account.label,
        kind: "expense" as const,
        totalAmount: 0,
      };
      category.totalAmount += row.amount;
      categories.set(key, category);
      spent += row.amount;
      monthTotal.spent += row.amount;
    }
    if (!Number.isSafeInteger(granted) || !Number.isSafeInteger(spent)) {
      return invalid(
        path,
        ERROR_CODES.UNSAFE_TOTAL,
        "集計額が安全に扱える整数の範囲を超えています",
      );
    }
    monthly.set(month, monthTotal);
  }

  const unused = granted - spent;
  return {
    status: "valid",
    value: {
      categories: [
        ...Array.from(categories.values())
          .filter((category) => category.totalAmount !== 0)
          .sort((a, b) => compareKeys(a.key, b.key)),
        { key: "unused", label: "未使用", kind: "unused", totalAmount: unused },
      ],
      monthly: Array.from(monthly.values()).sort((a, b) => compareKeys(a.month, b.month)),
      kpi: { granted, spent },
      unused,
    },
  };
}

function compareKeys(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
