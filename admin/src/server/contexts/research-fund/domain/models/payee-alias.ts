import type { ReceiptIssuer } from "@/server/contexts/research-fund/domain/models/extracted-receipt";
import {
  PAYEE_NAME_MAX_LENGTH,
  type PayeeLinkSource,
} from "@/server/contexts/research-fund/domain/models/payee";
import { normalizePayeeName } from "@/server/contexts/research-fund/domain/services/issuer-payee-matcher";

/**
 * 支払先の表記（書類から読み取った発行元の名称のうち、その支払先を指すと分かったもの）の業務ルール（#1727）。
 *
 * 支払先の名称は帳簿に載せる名前として人が正式名称に直すので、書類との照合の手がかりを名称とは別に持つ。
 * - 表記は人が登録せず、書類のある仕訳に支払先を紐づけたとき（スキャンの照合・登録、確認画面の紐づけ・作成）に記録する
 * - 同じ支払先に同じ表記（正規化して同じもの）は二重に記録しない。最初に記録した経路と書類が残る
 * - 紐づけを外しても表記は消さない。消すのは支払先の詳細ページで人が削除したときだけ
 * - 支払先を統合すると、統合元の表記と統合元の名称が統合先の表記になる（domain/models/payee-merge）
 * - 同じ表記が別の支払先にも記録されていることは許す（チェーン店など）。照合ではその表記で紐づけない
 */

/** 記録する表記。name は書類に印字されたまま（前後の空白だけ落とす）、normalizedName は照合用 */
export interface PayeeAliasName {
  name: string;
  normalizedName: string;
}

/** 支払先の詳細ページに並べる表記 */
export interface PayeeAlias {
  id: string;
  name: string;
  /** 記録した経路。manual = 確認画面の紐づけ / rule = スキャンの照合 / ai = スキャンでの登録 */
  source: PayeeLinkSource;
  /** 最初に見つかった書類。書類が削除された・統合元の支払先の名称から記録した表記なら null */
  document: { id: string; originalFilename: string } | null;
  /** ISO 8601 */
  createdAt: string;
  /** 同じ表記が記録されている、同じ議員の別の支払先（照合でこの表記を使えない理由） */
  sharedWith: { id: string; name: string }[];
}

/**
 * 書類の発行元から、支払先に記録する表記を作る。名称が読み取れていない・保存できない長さなら null（記録しない）。
 * 長すぎる名称を切り詰めて記録すると、書類に無い表記で照合することになるため記録しない。
 */
export function payeeAliasFromIssuer(issuer: ReceiptIssuer | null): PayeeAliasName | null {
  return payeeAliasFromName(issuer?.name ?? "");
}

/** 名称から、支払先に記録する表記を作る。空・保存できない長さなら null（記録しない） */
export function payeeAliasFromName(rawName: string): PayeeAliasName | null {
  const name = rawName.trim();
  if (name.length === 0 || name.length > PAYEE_NAME_MAX_LENGTH) return null;
  const normalizedName = normalizePayeeName(name);
  if (normalizedName.length === 0 || normalizedName.length > PAYEE_NAME_MAX_LENGTH) return null;
  return { name, normalizedName };
}
