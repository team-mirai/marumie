import { z } from "zod";
import { MAX_JOURNAL_AMOUNT } from "@/server/contexts/research-fund/domain/models/journal-amount";
import { RECEIPT_CATEGORIES } from "@/server/contexts/research-fund/domain/models/receipt-categories";
import {
  RF_ERROR_CODES,
  type ResearchFundResult,
} from "@/server/contexts/research-fund/domain/types/validation";

/** 書類の発行元。1 枚の書類の発行元は 1 者なので、明細ではなく書類単位で持つ */
export const receiptIssuerSchema = z.object({
  name: z.string().nullable().describe("発行元の名称（店名・会社名など）。読み取れなければ null"),
  address: z.string().nullable().describe("発行元の住所。読み取れなければ null"),
  phone: z.string().nullable().describe("発行元の電話番号。読み取れなければ null"),
  invoice_registration_number: z
    .string()
    .nullable()
    .describe("発行元のインボイス登録番号（T に続く13桁）。記載がなければ null"),
});

export type ReceiptIssuer = z.infer<typeof receiptIssuerSchema>;

export const extractedReceiptSchema = z.object({
  date: z.iso.date().describe("領収書の日付（YYYY-MM-DD）"),
  issuer: receiptIssuerSchema
    .nullable()
    .describe("書類の発行元（書類単位で 1 者）。発行元が読み取れなければ null"),
  items: z
    .array(
      z.object({
        item: z.string().min(1).describe("明細の項目名"),
        date: z.iso
          .date()
          .nullable()
          .describe(
            "明細の利用日（YYYY-MM-DD）。1枚の書類に利用日の異なる取引が並ぶとき（配車アプリの月次一括領収書など）に明細ごとの利用日を書く。書類の日付と同じならば null",
          ),
        amount: z.number().int().positive().max(MAX_JOURNAL_AMOUNT).describe("金額（円の整数）"),
        category_key: z
          .enum([
            "needs-review",
            ...(Object.keys(RECEIPT_CATEGORIES) as Array<keyof typeof RECEIPT_CATEGORIES>),
          ])
          .describe("費用カテゴリキー、または未確定を表す needs-review"),
        note: z
          .string()
          .nullable()
          .describe(
            "特記事項。一般に公開される。確認担当者への申し送りは書かず memo に書く。なければ null",
          ),
        memo: z
          .string()
          .nullable()
          .describe(
            "備考。公開されない、確認担当者向けのメモ（領収書ではない書類である、needs-review の理由など）。なければ null",
          ),
        split_group: z
          .string()
          .nullable()
          .describe("同一注文の明細を束ねるグループキー。なければ null"),
      }),
    )
    .min(1),
});

export type ExtractedReceipt = z.infer<typeof extractedReceiptSchema>;

function normalizeCategory(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const text = value.normalize("NFKC").trim();
  const labelMatch = Object.entries(RECEIPT_CATEGORIES).find(
    ([, category]) => category.label === text,
  );
  return labelMatch?.[0] ?? text.toLowerCase().replace(/[_\s]+/g, "-");
}

function normalizeAmount(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const text = value.normalize("NFKC").trim();
  // 数字の取りこぼしを避け、通貨記号・正しい3桁区切りだけを許容する。
  if (!/^(?:[¥￥]\s*)?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\s*円)?$/.test(text)) return value;
  return Number(text.replace(/[¥￥,円\s]/g, ""));
}

function trimText(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

// 欠落・空白のみの文字列だけを「書かなかった」とみなし、それ以外の値はスキーマの検証に任せる
function blankToNull(value: unknown): unknown {
  const text = trimText(value);
  return text === undefined || text === "" ? null : text;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function textOrNull(value: unknown): string | null {
  return typeof value === "string" ? value.trim() || null : null;
}

/**
 * 発行元を正規化する。発行元は支払先の照合に使う補助の情報なので、欠落・不正な形でも
 * 読み取り全体を失敗させず null（読み取れなかった）として扱う。
 * 発行元を出さない古い形式の読み取り結果もこれで受け付ける。
 */
function normalizeIssuer(value: unknown): ReceiptIssuer | null {
  if (!isRecord(value)) return null;
  const issuer = {
    name: textOrNull(value.name),
    address: textOrNull(value.address),
    phone: textOrNull(value.phone),
    invoice_registration_number: textOrNull(value.invoice_registration_number),
  };
  return Object.values(issuer).every((field) => field === null) ? null : issuer;
}

export const ExtractedReceipt = {
  /** 保存済みの読み取りの原文から発行元を取り出す。発行元が無い・古い形式なら null */
  issuerOf(rawJson: unknown): ReceiptIssuer | null {
    return isRecord(rawJson) ? normalizeIssuer(rawJson.issuer) : null;
  },
  normalize(input: unknown): ResearchFundResult<ExtractedReceipt> {
    const normalized = isRecord(input)
      ? {
          ...input,
          date: trimText(input.date),
          issuer: normalizeIssuer(input.issuer),
          items: Array.isArray(input.items)
            ? input.items.map((item: unknown) =>
                isRecord(item)
                  ? {
                      ...item,
                      item: trimText(item.item),
                      // 明細の日付を出さない古い形式の読み取り結果も受け付ける。空文字は書かなかったものとみなす
                      date: blankToNull(item.date),
                      amount: normalizeAmount(item.amount),
                      category_key: normalizeCategory(item.category_key),
                      note: trimText(item.note) ?? null,
                      // memo を出さない古い形式の読み取り結果も受け付ける。空文字は書かなかったものとみなす
                      memo: trimText(item.memo) || null,
                      split_group: trimText(item.split_group) ?? null,
                    }
                  : item,
              )
            : input.items,
        }
      : input;
    const result = extractedReceiptSchema.safeParse(normalized);
    if (result.success) return { status: "valid", value: result.data };
    return {
      status: "invalid",
      errors: result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        code: RF_ERROR_CODES.INVALID_EXTRACTION_OUTPUT,
        message: "領収書の抽出結果に欠損または不正な値があります",
        severity: "error",
      })),
    };
  },
};
