import { z } from "zod";
import { RECEIPT_CATEGORIES } from "@/server/contexts/research-fund/domain/models/receipt-categories";
import {
  RF_ERROR_CODES,
  type ResearchFundResult,
} from "@/server/contexts/research-fund/domain/types/validation";

export const extractedReceiptSchema = z.object({
  date: z.iso.date().describe("領収書の日付（YYYY-MM-DD）"),
  items: z
    .array(
      z.object({
        item: z.string().min(1).describe("明細の項目名"),
        amount: z.number().int().positive().max(999_999_999_999).describe("金額（円の整数）"),
        category_key: z
          .enum([
            "needs-review",
            ...(Object.keys(RECEIPT_CATEGORIES) as Array<keyof typeof RECEIPT_CATEGORIES>),
          ])
          .describe("費用カテゴリキー、または未確定を表す needs-review"),
        note: z.string().nullable().describe("公開される特記事項。なければ null"),
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const ExtractedReceipt = {
  normalize(input: unknown): ResearchFundResult<ExtractedReceipt> {
    const normalized = isRecord(input)
      ? {
          ...input,
          date: trimText(input.date),
          items: Array.isArray(input.items)
            ? input.items.map((item: unknown) =>
                isRecord(item)
                  ? {
                      ...item,
                      item: trimText(item.item),
                      amount: normalizeAmount(item.amount),
                      category_key: normalizeCategory(item.category_key),
                      note: trimText(item.note) ?? null,
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
