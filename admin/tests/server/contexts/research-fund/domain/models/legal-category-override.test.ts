import {
  LEGAL_CATEGORY_OVERRIDE_REASON_MAX_LENGTH,
  LegalCategoryOverridePolicy,
} from "@/server/contexts/research-fund/domain/models/legal-category-override";
import { buildLegalCategoryCatalog } from "@/shared/research-fund/legal-category";

const catalog = buildLegalCategoryCatalog([
  { legalCategoryKey: "office", legalLabel: "④ 事務所費" },
  { legalCategoryKey: "research", legalLabel: "⑦ 調査研究費" },
  { legalCategoryKey: "stay", legalLabel: "⑨ 滞在費" },
]);

function messageOf(result: ReturnType<typeof LegalCategoryOverridePolicy.validate>) {
  return result.status === "invalid" ? result.errors[0].message : null;
}

describe("LegalCategoryOverridePolicy.entryRejection（#1880）", () => {
  it("許可された帳簿の、下書き・確認済の支出の仕訳だけを上書きできる", () => {
    expect(LegalCategoryOverridePolicy.entryRejection({ source: "scan", status: "draft" }, true)).toBeNull();
    expect(LegalCategoryOverridePolicy.entryRejection({ source: "manual", status: "approved" }, true)).toBeNull();
  });

  it("上書きが許可されていない帳簿では拒否する", () => {
    expect(LegalCategoryOverridePolicy.entryRejection({ source: "scan", status: "draft" }, false)).toBe(
      "この帳簿では法定区分の上書きが許可されていません",
    );
  });

  it("支給の仕訳と公開中の仕訳は拒否する", () => {
    expect(LegalCategoryOverridePolicy.entryRejection({ source: "grant", status: "approved" }, true)).toContain("支給");
    expect(LegalCategoryOverridePolicy.entryRejection({ source: "scan", status: "published" }, true)).toContain("公開中");
  });
});

describe("LegalCategoryOverridePolicy.validate（#1880）", () => {
  it("区分と、前後の空白を落とした理由を返す", () => {
    expect(
      LegalCategoryOverridePolicy.validate({ legalCategoryKey: "research", reason: "  提出済みの報告書に合わせる\n" }, "office", catalog),
    ).toEqual({ status: "valid", value: { legalCategoryKey: "research", reason: "提出済みの報告書に合わせる" } });
  });

  it("理由が無い・空白だけなら拒否する", () => {
    expect(messageOf(LegalCategoryOverridePolicy.validate({ legalCategoryKey: "research", reason: " 　\n" }, "office", catalog))).toBe(
      "上書きの理由を入力してください",
    );
  });

  it("理由が長すぎれば拒否する", () => {
    const reason = "あ".repeat(LEGAL_CATEGORY_OVERRIDE_REASON_MAX_LENGTH + 1);
    expect(messageOf(LegalCategoryOverridePolicy.validate({ legalCategoryKey: "research", reason }, "office", catalog))).toContain("文字以内");
  });

  it("科目マスタに無い区分は拒否する", () => {
    expect(messageOf(LegalCategoryOverridePolicy.validate({ legalCategoryKey: "unknown", reason: "理由" }, "office", catalog))).toBe(
      "上書きする法定区分を選んでください",
    );
  });

  it("科目の既定と同じ区分は拒否する", () => {
    expect(messageOf(LegalCategoryOverridePolicy.validate({ legalCategoryKey: "office", reason: "理由" }, "office", catalog))).toContain(
      "科目の既定と同じ区分です",
    );
  });

  it("法定区分を持たない科目（要確認など）の仕訳は拒否する", () => {
    expect(messageOf(LegalCategoryOverridePolicy.validate({ legalCategoryKey: "research", reason: "理由" }, null, catalog))).toContain(
      "法定区分を持たない科目",
    );
  });
});

describe("LegalCategoryOverridePolicy の科目の変更と許可の取り消し（#1880）", () => {
  const override = { key: "research", label: "⑦ 調査研究費", reason: "理由" };

  it("上書き中の仕訳は、法定区分を持たない科目に変えられない", () => {
    expect(LegalCategoryOverridePolicy.accountChangeRejection(override, null)).toContain("先に上書きを外してください");
    expect(LegalCategoryOverridePolicy.accountChangeRejection(override, "stay")).toBeNull();
    expect(LegalCategoryOverridePolicy.accountChangeRejection(null, null)).toBeNull();
  });

  it("上書き中の仕訳が残っていれば、許可を取り消せない", () => {
    expect(LegalCategoryOverridePolicy.revocationRejection(0)).toBeNull();
    expect(LegalCategoryOverridePolicy.revocationRejection(2)).toBe(
      "法定区分を上書き中の仕訳が2件あるため、許可を取り消せません。先に各仕訳の上書きを外してください",
    );
  });
});
