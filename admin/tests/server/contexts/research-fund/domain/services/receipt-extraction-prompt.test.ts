import { z } from "zod";
import { extractedReceiptSchema } from "@/server/contexts/research-fund/domain/models/extracted-receipt";
import { RECEIPT_CATEGORIES } from "@/server/contexts/research-fund/domain/models/receipt-categories";
import {
  buildAutomaticReceiptPrompt,
  buildReceiptExtractionPrompt,
  DEFAULT_OFFICE_PROMPT,
} from "@/server/contexts/research-fund/domain/services/receipt-extraction-prompt";

describe("領収書抽出プロンプト", () => {
  it("Zodスキーマと21分類すべての定義から自動生成する", () => {
    const prompt = buildAutomaticReceiptPrompt();
    expect(Object.keys(RECEIPT_CATEGORIES)).toHaveLength(21);
    expect(prompt).toContain(JSON.stringify(z.toJSONSchema(extractedReceiptSchema), null, 2));
    for (const [key, { label, definition }] of Object.entries(RECEIPT_CATEGORIES)) {
      expect(prompt).toContain(`${key}（${label}）: ${definition}`);
    }
    expect(prompt).toContain("needs-review: 科目未確定");
  });

  it("分割粒度と迷った際のポリシーは編集可能なテンプレートだけに含める", () => {
    for (const policy of [
      "カテゴリ・項目が異なる明細は行を分けてください",
      "同一品の複数購入はまとめて構いません",
      "カテゴリの判断に迷ったら needs-review",
      "同一注文から分割した明細には同じ split_group",
    ]) {
      expect(DEFAULT_OFFICE_PROMPT).toContain(policy);
      expect(buildAutomaticReceiptPrompt()).not.toContain(policy);
    }
  });

  it.each(["", "分割せず1明細として読み取ってください。"])(
    "議員室のプロンプトをそのまま合成しデフォルトを強制しない",
    (officePrompt) => {
      expect(buildReceiptExtractionPrompt(officePrompt)).toBe(
        `${buildAutomaticReceiptPrompt()}\n\n議員室プロンプト:\n${officePrompt}`,
      );
      expect(buildReceiptExtractionPrompt(officePrompt)).not.toContain(DEFAULT_OFFICE_PROMPT);
    },
  );
});
