import { isCalendarDate } from "@/server/contexts/research-fund/domain/models/calendar-date";
import {
  invalidResearchFundResult,
  RF_ERROR_CODES,
  type ResearchFundResult,
} from "@/server/contexts/research-fund/domain/types/validation";

/**
 * 立替（秘書などが調研費の支出を立て替えること）の業務ルール。
 *
 * 立替は仕訳として計上せず、支出の仕訳が持つ事務所内の管理情報として扱う
 * （調研費は単式簿記の扱いなので、立替金・未払金の科目は作らない）。
 * - 立替者（advancedBy）が null なら「調研費口座から直接支出（立替なし）」
 * - 精算日（settledAt）が null なら未精算。立替者がいる仕訳だけが持てる
 */

/** 立替者の上限文字数。DB のカラム（VARCHAR(255)）に合わせる */
export const ADVANCED_BY_MAX_LENGTH = 255;

/** 立替情報を持てる仕訳の最小の形。精算の可否は状態・金額・日付から決まる */
export interface AdvanceEntry {
  readonly id: string;
  readonly description: string;
  readonly entryDate: string;
  readonly amount: number;
  readonly status: "draft" | "approved" | "published";
  readonly advancedBy: string | null;
  readonly settledAt: string | null;
}

/** 立替者ごとの未精算の件数と合計額 */
interface AdvanceSummaryRow {
  advancedBy: string;
  count: number;
  total: number;
}

/**
 * 立替者の表記を揃える。前後の空白（全角スペース・タブ・改行を含む）を落とし、
 * 空白だけなら「立替なし」として null にする。表記ゆれで集計が分かれないようにするため、
 * 空白の扱いだけは正規化し、それ以外（敬称・姓名の間の空白など）は利用者の入力のまま残す。
 */
export function normalizeAdvancedBy(value: string): string | null {
  // String.trim は全角スペース（U+3000）も空白として落とす。
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/** 立替者を検証する。正規化した結果（立替なしなら null）を返す */
export function validateAdvancedBy(value: string): ResearchFundResult<string | null> {
  const advancedBy = normalizeAdvancedBy(value);
  if (advancedBy !== null && advancedBy.length > ADVANCED_BY_MAX_LENGTH) {
    return invalidResearchFundResult(
      "advancedBy",
      RF_ERROR_CODES.INVALID_ADVANCED_BY,
      `立替者は${ADVANCED_BY_MAX_LENGTH}文字以内で入力してください`,
    );
  }
  return { status: "valid", value: advancedBy };
}

/**
 * 精算できる仕訳かを判定し、できない理由（利用者に見せる文）を返す。できるなら null。
 *
 * 下書きは金額が確定していないので精算できない。精算は「立替者へお金を移した」記録なので、
 * 立替でない仕訳と、すでに精算済の仕訳も対象にしない。
 */
export function settlementRejection(entry: AdvanceEntry): string | null {
  if (entry.advancedBy === null) return `「${entry.description}」は立替ではありません`;
  if (entry.settledAt !== null) return `「${entry.description}」はすでに精算済です`;
  if (entry.status === "draft")
    return `「${entry.description}」は下書きです（確認済・公開中の仕訳だけを精算できます）`;
  return null;
}

/**
 * 精算日を検証する。未来日にはできず、精算する仕訳の日付より前にもできない
 * （立て替えた日より前に精算することはない）。年度をまたぐ精算（3月分を4月に精算するなど）が
 * あるので、帳簿の年度内には限らない。
 *
 * @param entryDates 精算する仕訳の日付（YYYY-MM-DD）
 * @param today 今日の日付（YYYY-MM-DD）
 */
export function validateSettlementDate(
  value: string,
  entryDates: readonly string[],
  today: string,
): ResearchFundResult<string> {
  if (!isCalendarDate(value)) {
    return invalidResearchFundResult(
      "settledAt",
      RF_ERROR_CODES.INVALID_SETTLED_AT,
      "精算日を正しく入力してください",
    );
  }
  if (value > today) {
    return invalidResearchFundResult(
      "settledAt",
      RF_ERROR_CODES.INVALID_SETTLED_AT,
      "精算日に未来の日付は指定できません",
    );
  }
  const latest = entryDates.reduce<string | null>(
    (max, date) => (max === null || date > max ? date : max),
    null,
  );
  if (latest !== null && value < latest) {
    return invalidResearchFundResult(
      "settledAt",
      RF_ERROR_CODES.INVALID_SETTLED_AT,
      `精算日は仕訳の日付（${latest}）以降にしてください`,
    );
  }
  return { status: "valid", value };
}

/**
 * 立替者ごとの未精算の件数と合計額。立替でない仕訳と精算済の仕訳は数えない。
 * 並び順は合計額の多い順（同額なら立替者名順）で、精算する額の大きい相手から見られるようにする。
 */
export function summarizeUnsettledAdvances(entries: readonly AdvanceEntry[]): AdvanceSummaryRow[] {
  const rows = new Map<string, AdvanceSummaryRow>();
  for (const entry of entries) {
    if (entry.advancedBy === null || entry.settledAt !== null) continue;
    const row = rows.get(entry.advancedBy) ?? {
      advancedBy: entry.advancedBy,
      count: 0,
      total: 0,
    };
    row.count += 1;
    row.total += entry.amount;
    rows.set(entry.advancedBy, row);
  }
  return [...rows.values()].sort(
    (a, b) => b.total - a.total || a.advancedBy.localeCompare(b.advancedBy, "ja"),
  );
}

/**
 * スキャンの読み直しで作り直す下書きに引き継ぐ立替者を決める。
 *
 * 読み直しは書類単位で下書きを作り直すので、そのままでは入力済みの立替者が消える。
 * 元の下書きの立替者が 1 種類だけ（全件が同じ立替者）なら引き継ぐ。立替なしの下書きが
 * 混ざっている場合も「1 種類」とは見ない（立替でない支出に立替者を付けてしまうため）。
 */
export function inheritedAdvancedBy(values: readonly (string | null)[]): {
  advancedBy: string | null;
  /** 立替者が混ざっていて引き継げないか（確認ダイアログで知らせる） */
  mixed: boolean;
} {
  const distinct = new Set(values);
  if (distinct.size === 1) {
    const only = [...distinct][0];
    if (only !== null) return { advancedBy: only, mixed: false };
  }
  // 立替者が 1 件も入っていなければ、引き継ぐものが無いだけで「混ざっている」わけではない。
  const named = values.filter((value) => value !== null);
  return { advancedBy: null, mixed: named.length > 0 && distinct.size > 1 };
}
