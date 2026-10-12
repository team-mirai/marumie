import type { Payee } from "@/server/contexts/research-fund/domain/models/payee";
import {
  payeeAliasFromName,
  type PayeeAliasName,
} from "@/server/contexts/research-fund/domain/models/payee-alias";

/**
 * 支払先の統合（同じ相手の支払先が重複したときに 1 件にまとめる）の業務ルール（#1728）。
 *
 * 統合先（詳細ページで見ている支払先）に、同じ議員の別の支払先（統合元）をまとめる。
 * - 統合先の名称・郵便番号・住所・インボイス登録番号を残し、統合元は消す
 * - 統合元に紐づいていた仕訳は、議員のすべての帳簿で統合先に紐づけ直す。
 *   仕訳の金額・日付・科目・状態と紐づけの経路（誰が紐づけたか）は変えない
 * - 統合元の表記と統合元の名称を統合先の表記にする。以後、統合元の表記の書類も統合先に紐づく
 *   （仕訳だけ移して表記を移さないと、統合元の表記の書類が来たときに支払先がまた作られる）
 * - 統合先にすでにある表記（正規化して同じもの）は二重に持たない
 * - 両方にインボイス登録番号があって食い違えば、別の相手でありうるので統合しない
 */

/** 統合元の候補。仕訳の件数は議員のすべての帳簿で数える（統合で移る件数） */
export interface PayeeMergeCandidate extends Payee {
  entryCount: number;
  /** 統合元に記録された表記（記録の古い順） */
  aliases: PayeeAliasName[];
}

/** 支払先の統合の結果 */
export type PayeeMergeResult =
  | { status: "merged"; movedEntryCount: number }
  | { status: "not-found" }
  | { status: "rejected"; reason: string };

/**
 * 統合元を統合先にまとめられない理由。まとめられるなら null。
 * 別の議員の支払先は、存在することも伝えないよう「見つからない」として扱う。
 */
export function payeeMergeRejection(
  target: Pick<Payee, "id" | "politicianId" | "invoiceRegistrationNumber">,
  source: Pick<Payee, "id" | "politicianId" | "invoiceRegistrationNumber"> | null,
): string | null {
  if (source === null || source.politicianId !== target.politicianId)
    return "統合する支払先が見つかりません";
  if (source.id === target.id) return "同じ支払先どうしは統合できません";
  if (
    target.invoiceRegistrationNumber !== null &&
    source.invoiceRegistrationNumber !== null &&
    target.invoiceRegistrationNumber !== source.invoiceRegistrationNumber
  )
    return `インボイス登録番号が食い違うため統合できません（統合先: ${target.invoiceRegistrationNumber}、統合元: ${source.invoiceRegistrationNumber}）。別の相手でないか確かめ、同じ相手なら番号を直してから統合してください`;
  return null;
}

/**
 * 統合で統合先に加わる表記。統合元の表記と統合元の名称のうち、統合先にまだ無いもの（正規化した名称で比べる）。
 * 同じ表記は 1 つに畳み、統合元の表記を記録の古い順に並べてから統合元の名称を置く。
 */
export function payeeMergeAddedAliases(
  source: { name: string; aliases: readonly PayeeAliasName[] },
  targetAliases: readonly PayeeAliasName[],
): PayeeAliasName[] {
  const seen = new Set(targetAliases.map((alias) => alias.normalizedName));
  const sourceName = payeeAliasFromName(source.name);
  return [...source.aliases, ...(sourceName ? [sourceName] : [])].filter((alias) => {
    if (seen.has(alias.normalizedName)) return false;
    seen.add(alias.normalizedName);
    return true;
  });
}
