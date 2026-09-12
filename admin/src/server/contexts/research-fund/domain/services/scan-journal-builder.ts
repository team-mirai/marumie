import "server-only";
import type { ExtractedReceipt } from "@/server/contexts/research-fund/domain/models/extracted-receipt";
import { JournalEntryHash } from "@/server/contexts/research-fund/domain/models/journal-entry-hash";
import {
  JournalPosting,
  type JournalLine,
  type ResearchFundAccount,
} from "@/server/contexts/research-fund/domain/models/journal-posting";
import {
  invalidResearchFundResult,
  RF_ERROR_CODES,
  type ResearchFundResult,
} from "@/server/contexts/research-fund/domain/types/validation";

/** スキャンの下書き仕訳が使う決済科目。現金払いかどうかは読み取れないので普通預金に寄せる */
const ASSET_ACCOUNT_KEY = "bank";

export interface ScanDraftEntry {
  entryDate: string;
  description: string;
  accountKey: string;
  amount: number;
  note: string | null;
  /** 1書類から複数明細が出たとき、同一注文をまとめるキー。1明細なら null */
  splitGroup: string | null;
  hash: string;
  lines: readonly JournalLine[];
}

/**
 * 1 書類の抽出結果を下書き仕訳に変換する。
 *
 * - 明細ごとに 1 仕訳（費用 / 普通預金の 2 行）を作る
 * - 科目が確定していない明細（category_key = needs-review）も needs-review 科目のまま下書きにする
 * - 同一注文の明細（同じ split_group、または 1 書類に複数明細）には同じ split_group を振る
 * - hash は「日付・金額・項目名・書類ID」から作る。同じ書類の再処理で同じ hash になり、重複検知に使える
 */
export function buildScanDraftEntries(
  receipt: ExtractedReceipt,
  context: { documentId: string; accounts: readonly ResearchFundAccount[] },
): ResearchFundResult<ScanDraftEntry[]> {
  const accountByKey = new Map(context.accounts.map((account) => [account.key, account]));
  const assetAccount = accountByKey.get(ASSET_ACCOUNT_KEY);
  if (!assetAccount) {
    return invalidResearchFundResult(
      "assetAccount",
      RF_ERROR_CODES.INVALID_ACCOUNT,
      "決済科目（普通預金）の科目マスタがありません",
    );
  }

  const entries: ScanDraftEntry[] = [];
  for (const [index, item] of receipt.items.entries()) {
    const account = accountByKey.get(item.category_key);
    if (!account) {
      return invalidResearchFundResult(
        `items.${index}.category_key`,
        RF_ERROR_CODES.INVALID_ACCOUNT,
        `読み取られたカテゴリ「${item.category_key}」に対応する科目がありません`,
      );
    }
    const posting = JournalPosting.generate({
      pattern: "expense",
      source: "scan",
      amount: item.amount,
      account,
      assetAccount,
    });
    if (posting.status === "invalid") return posting;
    const hash = JournalEntryHash.generate({
      entryDate: receipt.date,
      amount: item.amount,
      description: item.item,
      documentId: context.documentId,
    });
    if (hash.status === "invalid") return hash;
    entries.push({
      entryDate: receipt.date,
      description: item.item,
      accountKey: account.key,
      amount: item.amount,
      note: item.note,
      splitGroup: resolveSplitGroup(item.split_group, receipt.items.length, context.documentId),
      hash: hash.value,
      lines: posting.value.lines,
    });
  }
  return { status: "valid", value: entries };
}

/**
 * split_group の採番。LLM が付けたキーはそのまま使わず書類 ID で名前空間を区切り、
 * 別の書類の同名キーと混ざらないようにする。1 書類 1 明細なら分割していないので null。
 */
function resolveSplitGroup(
  extracted: string | null,
  itemCount: number,
  documentId: string,
): string | null {
  if (itemCount <= 1) return null;
  return `doc-${documentId}${extracted ? `:${extracted}` : ""}`;
}
