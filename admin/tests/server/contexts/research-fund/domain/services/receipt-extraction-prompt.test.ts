import { z } from "zod";
import { extractedReceiptSchema } from "@/server/contexts/research-fund/domain/models/extracted-receipt";
import { RECEIPT_CATEGORIES } from "@/server/contexts/research-fund/domain/models/receipt-categories";
import {
  buildAutomaticReceiptPrompt,
  buildReceiptExtractionPrompt,
  DEFAULT_OFFICE_PROMPT,
} from "@/server/contexts/research-fund/domain/services/receipt-extraction-prompt";

describe("領収書抽出プロンプト", () => {
  it("Zodスキーマと20分類すべての定義から自動生成する", () => {
    const prompt = buildAutomaticReceiptPrompt();
    expect(Object.keys(RECEIPT_CATEGORIES)).toHaveLength(20);
    expect(prompt).toContain(JSON.stringify(z.toJSONSchema(extractedReceiptSchema), null, 2));
    for (const [key, { label, definition }] of Object.entries(RECEIPT_CATEGORIES)) {
      expect(prompt).toContain(`${key}（${label}）: ${definition}`);
    }
    expect(prompt).toContain("needs-review: 科目未確定");
  });

  it("出力スキーマの説明で、公開される note と公開されない memo の違いを伝える", () => {
    const prompt = buildAutomaticReceiptPrompt();
    expect(prompt).toContain("特記事項。一般に公開される");
    expect(prompt).toContain("備考。公開されない、確認担当者向けのメモ");
  });

  it("利用日の異なる取引が並ぶ書類では、明細ごとの利用日を items の date に入れるよう伝える", () => {
    const prompt = buildAutomaticReceiptPrompt();
    expect(prompt).toContain("明細の利用日（YYYY-MM-DD）");
    expect(prompt).toContain("明細ごとの利用日を items の date に入れてください");
  });

  it("発行元は明細ごとではなく書類単位で issuer に入れるよう伝える", () => {
    const prompt = buildAutomaticReceiptPrompt();
    expect(prompt).toContain("書類の発行元（書類単位で 1 者）");
    expect(prompt).toContain("明細ごとではなく書類単位で issuer に1つだけ入れてください");
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

  it("読み直しの指示があれば議員室プロンプトの後ろに添える", () => {
    const prompt = buildReceiptExtractionPrompt("議員室の方針", "駐車場代は別の科目にしてください");
    expect(prompt.startsWith(buildReceiptExtractionPrompt("議員室の方針"))).toBe(true);
    expect(prompt).toContain("読み直しの指示");
    expect(prompt.indexOf("議員室の方針")).toBeLessThan(
      prompt.indexOf("駐車場代は別の科目にしてください"),
    );
  });

  it("読み直しの指示がなければ通常の読み取りと同じ", () => {
    expect(buildReceiptExtractionPrompt("議員室の方針", null)).toBe(
      buildReceiptExtractionPrompt("議員室の方針"),
    );
  });
});
