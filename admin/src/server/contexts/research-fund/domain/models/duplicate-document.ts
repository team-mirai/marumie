import { ExtractedReceipt } from "@/server/contexts/research-fund/domain/models/extracted-receipt";
import { normalizeInvoiceRegistrationNumber } from "@/server/contexts/research-fund/domain/models/payee";
import { normalizePayeeName } from "@/server/contexts/research-fund/domain/services/issuer-payee-matcher";

/**
 * 同じ領収書を二重にスキャンした可能性のある書類の業務ルール（#1731）。
 *
 * 仕訳の hash は書類 ID を含むので、同じ紙を別の書類としてアップロードすると二重に計上できてしまう。
 * 紙を撮り直すと画像は変わるので、読み取った内容で比べる。同じ帳簿の中で次をすべて満たす別の書類を
 * 「同じ書類の可能性がある」とみなし、画面で警告する（読み取り・確認済にする操作は止めない）。
 * 1. 書類の日付が一致する
 * 2. 書類の合計金額（読み取った明細の金額の合計）が一致する。明細の分け方は読み取りごとに揺れるので合計で比べる
 * 3. 発行元が食い違わない。インボイス登録番号 → 紐づいた支払先 → 発行元の名称（支払先との照合と同じ正規化）の順に、
 *    両方の書類で分かるものを 1 つだけ使って比べる。何も使えなければ食い違わないとみなす（見逃すより確認の手間が増える方が安全）
 * 4. どちらの書類にも仕訳が 1 件以上残っている（仕訳をすべて取り消した書類は対象にしない）
 */

/** 重複の判定に渡す書類。仕訳が 1 件以上残っている書類だけを渡す（条件 4） */
export interface ScannedDocument {
  documentId: string;
  originalFilename: string;
  /** 書類の最新の成功した読み取りの原文。読み取りが無ければ null */
  rawJson: unknown;
  /** 書類から作られた仕訳に紐づく支払先（重複なし。未紐づけは含まない） */
  payeeIds: readonly string[];
}

/** 同じ書類の可能性がある相手の書類。画面で相手の書類を開くのに使う */
export interface DuplicateDocument {
  documentId: string;
  originalFilename: string;
  /** 書類の日付（YYYY-MM-DD） */
  date: string;
  totalAmount: number;
}

/** 書類 ID → 同じ書類の可能性がある相手の書類。相手が無い書類は含まない */
export type DuplicateDocuments = Record<string, DuplicateDocument[]>;

interface Fingerprint extends DuplicateDocument {
  invoiceRegistrationNumber: string | null;
  /** 紐づいた支払先が 1 つに決まるときだけ持つ */
  payeeId: string | null;
  issuerName: string | null;
}

function fingerprintOf(document: ScannedDocument): Fingerprint | null {
  const receipt = ExtractedReceipt.normalize(document.rawJson);
  if (receipt.status === "invalid") return null;
  const { date, issuer, items } = receipt.value;
  return {
    documentId: document.documentId,
    originalFilename: document.originalFilename,
    date,
    totalAmount: items.reduce((sum, item) => sum + item.amount, 0),
    // 形の合わない番号は読み取りの誤りでありうるので、分からないものとして扱う
    invoiceRegistrationNumber:
      normalizeInvoiceRegistrationNumber(issuer?.invoice_registration_number ?? "") ?? null,
    payeeId: document.payeeIds.length === 1 ? document.payeeIds[0] : null,
    issuerName: normalizePayeeName(issuer?.name ?? "") || null,
  };
}

/** 両方の書類で分かる発行元の手がかりのうち、優先順の最初の 1 つで比べる。何も使えなければ食い違わない */
function issuersConflict(a: Fingerprint, b: Fingerprint): boolean {
  for (const key of ["invoiceRegistrationNumber", "payeeId", "issuerName"] as const) {
    if (a[key] !== null && b[key] !== null) return a[key] !== b[key];
  }
  return false;
}

/** 帳簿の書類の中から、同じ書類の可能性がある組を探す。警告はお互いの書類に付ける */
export function findDuplicateDocuments(documents: readonly ScannedDocument[]): DuplicateDocuments {
  const groups = new Map<string, Fingerprint[]>();
  for (const document of documents) {
    const fingerprint = fingerprintOf(document);
    if (fingerprint === null) continue;
    const key = `${fingerprint.date}:${fingerprint.totalAmount}`;
    groups.set(key, [...(groups.get(key) ?? []), fingerprint]);
  }
  const duplicates: DuplicateDocuments = {};
  for (const group of groups.values()) {
    for (const document of group) {
      const others = group.filter(
        (other) => other.documentId !== document.documentId && !issuersConflict(document, other),
      );
      if (others.length > 0)
        duplicates[document.documentId] = others.map(
          ({ documentId, originalFilename, date, totalAmount }) => ({
            documentId,
            originalFilename,
            date,
            totalAmount,
          }),
        );
    }
  }
  return duplicates;
}
