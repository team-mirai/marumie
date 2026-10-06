import type { ReceiptIssuer } from "@/server/contexts/research-fund/domain/models/extracted-receipt";
import {
  normalizeInvoiceRegistrationNumber,
  type Payee,
} from "@/server/contexts/research-fund/domain/models/payee";

/** 法人格の略記（NFKC で ㈱・（株） などは (株) に揃う）を正式な表記に揃える */
const LEGAL_ENTITY_ABBREVIATIONS: Readonly<Record<string, string>> = {
  "(株)": "株式会社",
  "(有)": "有限会社",
  "(同)": "合同会社",
  "(名)": "合名会社",
  "(資)": "合資会社",
  "(一社)": "一般社団法人",
  "(一財)": "一般財団法人",
  "(公社)": "公益社団法人",
  "(公財)": "公益財団法人",
  "(医)": "医療法人",
  "(特非)": "特定非営利活動法人",
  "(独)": "独立行政法人",
};
const LEGAL_ENTITY_ABBREVIATION = new RegExp(
  Object.keys(LEGAL_ENTITY_ABBREVIATIONS)
    .map((abbreviation) => abbreviation.replace(/[()]/g, "\\$&"))
    .join("|"),
  "g",
);

/**
 * 支払先の名称を照合用に正規化する。全角半角・英字の大小・空白・法人格の略記の表記ゆれを吸収する。
 * 法人格の位置（前株・後株）や法人格の有無は吸収しない（別の相手でありうるため）。
 */
export function normalizePayeeName(name: string): string {
  return name
    .normalize("NFKC")
    .replace(/\s/g, "")
    .replace(LEGAL_ENTITY_ABBREVIATION, (abbreviation) => LEGAL_ENTITY_ABBREVIATIONS[abbreviation])
    .toLowerCase();
}

/**
 * 書類の発行元に確実に一致する支払先を 1 件返す。一致しない・候補が複数なら null。
 *
 * 提出物は公になるので、誤って紐づけるより未紐づけで残すほうがよい。一致の判定は次の 2 つだけで、
 * 部分一致や類似度では紐づけない。
 * 1. インボイス登録番号の一致。番号が一致する支払先があれば、名称は見ずにそれだけで決める
 * 2. 正規化した名称の一致。ただし発行元と支払先の両方にインボイス登録番号があり食い違う支払先は除く
 *
 * 渡す支払先は確認済みのものに限る（いまは支払先がすべて人の作成したもので確認済み。domain/models/payee）。
 */
export function matchPayeeByIssuer<T extends Pick<Payee, "name" | "invoiceRegistrationNumber">>(
  issuer: ReceiptIssuer | null,
  payees: readonly T[],
): T | null {
  if (issuer === null) return null;
  const invoice =
    normalizeInvoiceRegistrationNumber(issuer.invoice_registration_number ?? "") ?? null;
  if (invoice !== null) {
    const byInvoice = payees.filter((payee) => payee.invoiceRegistrationNumber === invoice);
    if (byInvoice.length > 0) return onlyOne(byInvoice);
  }
  const name = normalizePayeeName(issuer.name ?? "");
  if (name.length === 0) return null;
  const byName = payees.filter(
    (payee) =>
      normalizePayeeName(payee.name) === name &&
      // 番号が一致する支払先は上で決まっているので、ここに残るのは番号が食い違うか、どちらかが番号を持たないもの
      (invoice === null || payee.invoiceRegistrationNumber === null),
  );
  return onlyOne(byName);
}

function onlyOne<T>(candidates: readonly T[]): T | null {
  return candidates.length === 1 ? candidates[0] : null;
}
