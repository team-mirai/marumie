import type { ReceiptIssuer } from "@/server/contexts/research-fund/domain/models/extracted-receipt";
import {
  invalidResearchFundResult,
  RF_ERROR_CODES,
  type ResearchFundResult,
} from "@/server/contexts/research-fund/domain/types/validation";

/**
 * 支払先（支出を受けた者）の業務ルール。
 *
 * 議員課に提出する帳簿の「支出を受けた者の氏名・住所」を埋めるために、仕訳から支払先を参照する。
 * タクシー会社や JR のように同じ相手が繰り返し出てくるので、支払先は議員ごとのマスタとして持ち、
 * 一度直せば紐づけた全仕訳に効くようにする。政治資金の取引先（counterparts）とは共用しない。
 *
 * - 支払先は議員ごとに持つ。別の議員（＝別テナント）の支払先は見えず、紐づけられない
 * - 支払先に確認状態（未確認・確認済み）は持たない（#1675）。誰が作った支払先も同じに扱い、
 *   書類の発行元との照合（domain/services/issuer-payee-matcher）も議員の支払先すべてを相手にする。
 *   AI が作った支払先とその日時は、支払先の列ではなく AI による解決の記録から分かるようにする（#1658）
 */

export const PAYEE_NAME_MAX_LENGTH = 255;
export const PAYEE_ADDRESS_MAX_LENGTH = 255;
/** 郵便番号の入力欄の上限。保存するのはハイフン付きの 8 文字（123-4567） */
export const PAYEE_POSTAL_CODE_INPUT_MAX_LENGTH = 10;
/** インボイス登録番号の入力欄の上限。保存するのは "T" + 13 桁の 14 文字 */
export const PAYEE_INVOICE_NUMBER_INPUT_MAX_LENGTH = 20;

/** 支払先を仕訳に紐づけた主体。manual = 人が選んだ / rule = 支払先名のルール照合 / ai = AI の推定 */
export type PayeeLinkSource = "manual" | "rule" | "ai";

export interface Payee {
  id: string;
  politicianId: string;
  name: string;
  /** "123-4567" の形。null = 未入力 */
  postalCode: string | null;
  /** 空文字 = 未入力（DB の一意制約で NULL が重複扱いにならない問題を避けるため NULL を使わない） */
  address: string;
  /** "T" + 13 桁。null = 未入力・インボイス未登録 */
  invoiceRegistrationNumber: string | null;
}

/** 一覧に出す支払先。紐づいている仕訳の件数（議員の全帳簿）を添える */
export interface PayeeSummary extends Payee {
  usageCount: number;
}

/** 画面から送られる支払先の入力（未入力は空文字） */
export interface PayeeFormInput {
  name: string;
  postalCode: string;
  address: string;
  invoiceRegistrationNumber: string;
}

/** 検証・正規化した支払先の入力 */
export type PayeeInput = Omit<Payee, "id" | "politicianId">;

export class PayeeError extends Error {}

// 長音記号・全角ハイフン・マイナスなど、郵便番号の区切りとして入力されがちな文字
const HYPHENS = /[-‐‑‒–—―−ー－]/g;

/** 全角の英数字を半角にし、空白を落とす */
function toHalfWidth(value: string): string {
  return value.normalize("NFKC").replace(/\s/g, "");
}

/**
 * 郵便番号を "123-4567" に揃える。全角数字・〒・区切りの表記ゆれは吸収する。
 * 空なら null（未入力）、7 桁の数字にならなければ undefined（不正）。
 */
export function normalizePostalCode(value: string): string | null | undefined {
  const digits = toHalfWidth(value).replace(/^〒/, "").replace(HYPHENS, "");
  if (digits.length === 0) return null;
  if (!/^\d{7}$/.test(digits)) return undefined;
  return `${digits.slice(0, 3)}-${digits.slice(3)}`;
}

/**
 * インボイス登録番号を "T" + 13 桁に揃える。全角・小文字の t・区切りの表記ゆれは吸収する。
 * 空なら null（未入力）、形が合わなければ undefined（不正）。
 */
export function normalizeInvoiceRegistrationNumber(value: string): string | null | undefined {
  const normalized = toHalfWidth(value).replace(HYPHENS, "").toUpperCase();
  if (normalized.length === 0) return null;
  if (!/^T\d{13}$/.test(normalized)) return undefined;
  return normalized;
}

/** 住所の先頭に書かれた郵便番号（〒123-4567 など）。発行元の住所から支払先の郵便番号を切り出す */
const LEADING_POSTAL_CODE = /^〒?\s*(\d{3}\s*[-‐‑‒–—―−ー－]?\s*\d{4})\s*/;

/**
 * 書類から読み取った発行元を、支払先の作成フォームの入力にする（確認画面の「この内容で支払先を作って紐づける」）。
 * 住所の先頭の郵便番号は郵便番号の欄に移す。インボイス登録番号の形が合わなければ、
 * 作成が失敗しないよう未入力にする（読み取りの原文には残っている）。電話番号は支払先に持たない。
 */
export function payeeFormInputFromIssuer(issuer: ReceiptIssuer): PayeeFormInput {
  const rawAddress = (issuer.address ?? "").normalize("NFKC").trim();
  const postal = LEADING_POSTAL_CODE.exec(rawAddress);
  const postalCode = postal ? normalizePostalCode(postal[1]) : null;
  const address = postal && postalCode ? rawAddress.slice(postal[0].length).trim() : rawAddress;
  const invoice = normalizeInvoiceRegistrationNumber(issuer.invoice_registration_number ?? "");
  return {
    name: issuer.name ?? "",
    postalCode: postalCode ?? "",
    address,
    invoiceRegistrationNumber: invoice ?? "",
  };
}

/** 支払先の入力を検証し、保存する形に正規化する */
export function validatePayeeInput(input: PayeeFormInput): ResearchFundResult<PayeeInput> {
  const name = input.name.trim();
  if (name.length === 0)
    return invalidResearchFundResult(
      "name",
      RF_ERROR_CODES.INVALID_PAYEE,
      "支払先の名称を入力してください",
    );
  if (name.length > PAYEE_NAME_MAX_LENGTH)
    return invalidResearchFundResult(
      "name",
      RF_ERROR_CODES.INVALID_PAYEE,
      `支払先の名称は${PAYEE_NAME_MAX_LENGTH}文字以内で入力してください`,
    );
  const postalCode = normalizePostalCode(input.postalCode);
  if (postalCode === undefined)
    return invalidResearchFundResult(
      "postalCode",
      RF_ERROR_CODES.INVALID_PAYEE,
      "郵便番号は7桁の数字で入力してください（例: 123-4567）",
    );
  const address = input.address.trim();
  if (address.length > PAYEE_ADDRESS_MAX_LENGTH)
    return invalidResearchFundResult(
      "address",
      RF_ERROR_CODES.INVALID_PAYEE,
      `住所は${PAYEE_ADDRESS_MAX_LENGTH}文字以内で入力してください`,
    );
  const invoiceRegistrationNumber = normalizeInvoiceRegistrationNumber(
    input.invoiceRegistrationNumber,
  );
  if (invoiceRegistrationNumber === undefined)
    return invalidResearchFundResult(
      "invoiceRegistrationNumber",
      RF_ERROR_CODES.INVALID_PAYEE,
      "インボイス登録番号は T に続く13桁の数字で入力してください",
    );
  return { status: "valid", value: { name, postalCode, address, invoiceRegistrationNumber } };
}

/**
 * 支払先がこの議員のものかを判定し、紐づけ・編集できない理由を返す。できるなら null。
 * 別の議員（別テナント）の支払先は、存在することも伝えないよう「見つからない」として扱う。
 */
export function payeeAccessRejection(
  payee: Pick<Payee, "politicianId"> | null,
  politicianId: string,
): string | null {
  if (payee === null || payee.politicianId !== politicianId) return "支払先が見つかりません";
  return null;
}

/** 支払先を紐づけられる仕訳の最小の形 */
interface PayeeLinkableEntry {
  id: string;
  source: "scan" | "manual" | "grant";
  documentId: string | null;
}

/**
 * 選んだ仕訳に、同じ書類から作られた仕訳を加える（選んだ順を保ち、重複を畳む）。
 * 1 枚の書類の発行元は 1 者なので、分割明細のどれかに支払先を付けたら残りにも同じ支払先を付ける。
 * 支給は支払先を持たないので加えない。
 */
export function withSameDocumentEntries<T extends PayeeLinkableEntry>(
  selected: readonly T[],
  all: readonly T[],
): T[] {
  const documentIds = new Set(
    selected.flatMap((entry) => (entry.documentId === null ? [] : [entry.documentId])),
  );
  const siblings = all.filter(
    (entry) =>
      entry.source !== "grant" && entry.documentId !== null && documentIds.has(entry.documentId),
  );
  return [...new Map([...selected, ...siblings].map((entry) => [entry.id, entry])).values()];
}

/** 支払先が未設定の支出か（確認画面の注意表示と絞り込みに使う）。支給は支払先を持たないので対象外 */
export function isPayeeUnset(entry: {
  source: PayeeLinkableEntry["source"];
  payeeId: string | null;
}) {
  return entry.source !== "grant" && entry.payeeId === null;
}

/** 支払先の表示順（名称順、同名なら住所順） */
export function sortPayees<T extends Pick<Payee, "name" | "address">>(payees: readonly T[]): T[] {
  return [...payees].sort(
    (a, b) => a.name.localeCompare(b.name, "ja") || a.address.localeCompare(b.address, "ja"),
  );
}

/** 仕訳と支払先の紐づけ（どの支払先に、どの主体が紐づけたか） */
export interface PayeeLink {
  payeeId: string;
  source: PayeeLinkSource;
}

/**
 * スキャンの読み直しで作り直す下書きに引き継ぐ支払先を決める（立替者の inheritedAdvancedBy と同じ考え方）。
 *
 * 読み直しは書類単位で下書きを作り直すので、そのままでは紐づけた支払先が消える。
 * 元の下書きの支払先が 1 種類だけ（全件が同じ支払先）なら引き継ぐ。未設定の下書きが混ざっていれば引き継がない。
 * 同じ支払先でも紐づけ元が下書きごとに違うときは、人が選んだ（manual）ものがあれば manual として引き継ぐ。
 */
export function inheritedPayeeLink(
  rows: readonly { payeeId: string | null; payeeLinkSource: PayeeLinkSource | null }[],
): PayeeLink | null {
  const distinct = new Set(rows.map((row) => row.payeeId));
  const [payeeId] = distinct;
  if (distinct.size !== 1 || !payeeId) return null;
  // 紐づけ元が記録されていない支払先は、主体が分からないので人が選んだものとして扱う
  const sources = new Set(rows.map((row) => row.payeeLinkSource ?? "manual"));
  const [first] = sources;
  return { payeeId, source: sources.has("manual") || !first ? "manual" : first };
}

/**
 * 読み直しで作り直す下書きに紐づける支払先を、引き継いだ支払先と発行元の照合結果から決める。
 *
 * 優先順位: 人が選んだ支払先（manual）の引き継ぎ > 今回の発行元の照合（rule） > 照合・推定で付いていた支払先の引き継ぎ。
 * - 人の判断は機械の照合より信頼できるので、照合で別の支払先が決まっても人が選んだものを残す
 * - 照合・推定で付いていた支払先は、今回の読み取り結果で照合し直せたならそちらを採る（読み直しは読み取りを正す操作のため）
 * - 今回の照合で決まらなければ、前に付いていた支払先を消さずに残す
 */
export function rereadPayeeLink(
  inherited: PayeeLink | null,
  matchedPayeeId: string | null,
): PayeeLink | null {
  if (inherited?.source === "manual") return inherited;
  if (matchedPayeeId !== null) return { payeeId: matchedPayeeId, source: "rule" };
  return inherited;
}
