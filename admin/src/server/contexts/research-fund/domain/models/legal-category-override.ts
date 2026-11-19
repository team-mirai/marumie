import {
  invalidResearchFundResult,
  RF_ERROR_CODES,
  type ResearchFundResult,
} from "@/server/contexts/research-fund/domain/types/validation";
import type {
  LegalCategoryCatalog,
  ResearchFundLegalCategory,
} from "@/shared/research-fund/legal-category";

/**
 * 仕訳ごとの法定区分の上書きの業務ルール（#1880）。
 *
 * 法定区分は科目（20分類）から1つに決まるのが原則。まる見え導入前に報告書を提出済みの年度の帳簿では
 * 報告書で使った区分が科目の既定と違う仕訳があるので、管理者（admin）が許可した帳簿に限って仕訳ごとに区分を上書きできる。
 * - 帳簿ごとの許可は管理者だけが切り替える。上書き中の仕訳が残っている帳簿では許可を取り消せない
 * - 上書きできるのは支出の仕訳だけ。法定区分を持たない科目（要確認など）の仕訳は上書きできない
 * - 上書きには理由が必須。科目の既定と同じ区分への上書きは受け付けない（上書きを外せばよい）
 * - 法定区分は公開ページにも出るので、公開中の仕訳では変更できない（内容の編集と同じく、確認済に戻してから変える）
 * - 仕訳を下書き・確認済に戻しても上書きは残す（公開の取り消し・再公開で区分が変わらないように）
 * 出力での区分の決め方（上書きがあればそれ、無ければ科目の既定）は shared/research-fund/legal-category.ts に置く。
 */

/** 上書きの理由の上限文字数 */
export const LEGAL_CATEGORY_OVERRIDE_REASON_MAX_LENGTH = 500;

/** 仕訳に付いている上書き（管理画面で、上書き中であること・指定した区分・理由を見せる） */
export interface LegalCategoryOverride extends ResearchFundLegalCategory {
  readonly reason: string;
}

/** 保存する上書き */
export interface LegalCategoryOverrideInput {
  readonly legalCategoryKey: string;
  readonly reason: string;
}

/** 上書きの可否の判定に使う仕訳の最小の形 */
interface OverridableEntry {
  readonly source: "scan" | "manual" | "grant";
  readonly status: "draft" | "approved" | "published";
}

export const LegalCategoryOverridePolicy = {
  /**
   * その仕訳の上書きを指定・変更・解除させない理由（利用者に見せる文）。してよければ null。
   * 画面の操作の出し分けと、サーバー側の拒否の両方が使う。
   */
  entryRejection(entry: OverridableEntry, allowed: boolean): string | null {
    if (!allowed) return "この帳簿では法定区分の上書きが許可されていません";
    if (entry.source === "grant") return "支給の仕訳の法定区分は上書きできません";
    if (entry.status === "published")
      return "公開中の仕訳の法定区分は変更できません。先に確認済に戻してください";
    return null;
  },

  /**
   * 上書きを検証し、保存する形（理由の前後の空白を落とした形）にそろえる。
   * accountLegalCategoryKey は仕訳の科目の既定の区分（法定区分を持たない科目なら null）。
   */
  validate(
    input: LegalCategoryOverrideInput,
    accountLegalCategoryKey: string | null,
    catalog: LegalCategoryCatalog,
  ): ResearchFundResult<LegalCategoryOverrideInput> {
    if (!input || typeof input.legalCategoryKey !== "string" || typeof input.reason !== "string")
      return invalid("legalCategoryOverride", "法定区分の上書きの入力が不正です");
    if (accountLegalCategoryKey === null)
      return invalid(
        "accountKey",
        "法定区分を持たない科目（要確認など）の仕訳は上書きできません。先に科目を確定してください",
      );
    if (!catalog.has(input.legalCategoryKey))
      return invalid("legalCategoryKey", "上書きする法定区分を選んでください");
    if (input.legalCategoryKey === accountLegalCategoryKey)
      return invalid(
        "legalCategoryKey",
        "科目の既定と同じ区分です。既定に戻すときは上書きを外してください",
      );
    const reason = input.reason.trim();
    if (reason.length === 0) return invalid("reason", "上書きの理由を入力してください");
    if (reason.length > LEGAL_CATEGORY_OVERRIDE_REASON_MAX_LENGTH)
      return invalid(
        "reason",
        `上書きの理由は${LEGAL_CATEGORY_OVERRIDE_REASON_MAX_LENGTH}文字以内で入力してください`,
      );
    return { status: "valid", value: { legalCategoryKey: input.legalCategoryKey, reason } };
  },

  /**
   * 上書きのある仕訳の科目を変えさせない理由。変えてよければ null。
   * 法定区分を持たない科目（要確認など）へ変えると、上書きできない仕訳に上書きが残ってしまう。
   */
  accountChangeRejection(
    override: LegalCategoryOverride | null,
    nextAccountLegalCategoryKey: string | null,
  ): string | null {
    if (override === null || nextAccountLegalCategoryKey !== null) return null;
    return "法定区分を上書き中の仕訳は、法定区分を持たない科目（要確認など）にできません。先に上書きを外してください";
  },

  /** 帳簿の上書きの許可を取り消させない理由。取り消してよければ null */
  revocationRejection(overrideCount: number): string | null {
    if (overrideCount === 0) return null;
    return `法定区分を上書き中の仕訳が${overrideCount}件あるため、許可を取り消せません。先に各仕訳の上書きを外してください`;
  },
};

function invalid(path: string, message: string) {
  return invalidResearchFundResult(path, RF_ERROR_CODES.INVALID_LEGAL_CATEGORY_OVERRIDE, message);
}
