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
 * - 1 書類から複数明細が出たら、その書類の全明細に同じ split_group を振る
 * - hash は「日付・金額・項目名・書類ID」から作る。同じ書類の再処理で同じ hash になり、重複検知に使える。
 *   同じ書類にそこまで同一の明細が複数あるときは出現順の連番で区別し、正当な明細が重複扱いで落ちないようにする
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
  // 日付・金額・項目名まで同一の明細の出現回数。2 件目以降は連番で hash を分ける。
  const seen = new Map<string, number>();
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
    const occurrence = (seen.get(itemKey(receipt.date, item.amount, item.item)) ?? 0) + 1;
    seen.set(itemKey(receipt.date, item.amount, item.item), occurrence);
    const hash = JournalEntryHash.generate({
      entryDate: receipt.date,
      amount: item.amount,
      description: item.item,
      documentId: context.documentId,
      discriminator: occurrence > 1 ? occurrence - 1 : null,
    });
    if (hash.status === "invalid") return hash;
    entries.push({
      entryDate: receipt.date,
      description: item.item,
      accountKey: account.key,
      amount: item.amount,
      note: item.note,
      splitGroup: resolveSplitGroup(receipt.items.length, context.documentId),
      hash: hash.value,
      lines: posting.value.lines,
    });
  }
  return { status: "valid", value: entries };
}

/**
 * split_group の採番。LLM が付けたキーはそのまま使わず書類 ID で採番する。
 * 抽出時の検証は明細間でキーが一致することまでは見ないため、キーを混ぜると
 * 同じ書類の明細が別グループに割れる。1 書類は 1 グループとして扱う。
 * 1 書類 1 明細なら分割していないので null。
 */
function resolveSplitGroup(itemCount: number, documentId: string): string | null {
  if (itemCount <= 1) return null;
  return `doc-${documentId}`;
}

/** 「同じ明細」とみなす単位のキー。hash の入力と同じ 3 項目で揃える。 */
function itemKey(entryDate: string, amount: number, description: string): string {
  return JSON.stringify([entryDate, amount, description]);
}
