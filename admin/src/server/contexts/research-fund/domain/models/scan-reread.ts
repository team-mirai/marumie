import { inheritedAdvancedBy } from "@/server/contexts/research-fund/domain/models/advance";
import { SCAN_BATCH_MAX_DOCUMENTS } from "@/server/contexts/research-fund/domain/models/scan-batch";
import {
  invalidResearchFundResult,
  RF_ERROR_CODES,
  type ResearchFundResult,
} from "@/server/contexts/research-fund/domain/types/validation";

/** 読み直し指示の上限文字数。読み取りプロンプトに添えるので長すぎる指示は受け付けない */
export const REREAD_INSTRUCTION_MAX_LENGTH = 1000;

/** 読み直しの候補になった書類。選んだ下書きが紐づく書類ごとに 1 件 */
export interface RereadCandidate {
  documentId: string;
  /** この書類から作られた仕訳に、確認済・公開中のものが 1 件でもあるか */
  hasReviewedEntries: boolean;
}

interface RereadPlan {
  /** 読み直す書類 */
  documentIds: string[];
  /** 確認済・公開中の仕訳を含むため外した書類の数 */
  excludedCount: number;
}

/** 下書きの選択から読み直しの対象を数える（確認ダイアログ用）。画面の仕訳一覧だけで数える */
interface RereadPreview {
  /** 読み直す書類の数 */
  documentCount: number;
  /** 読み直しで作り直される下書きの数（選んでいない同じ書類の下書きも含む） */
  draftCount: number;
  /** 確認済・公開中の仕訳を含むため外れる書類の数 */
  excludedDocumentCount: number;
  /** 書類の紐づかない下書き（手入力など）の数。読み直しの対象にならない */
  withoutDocumentCount: number;
  /** 立替者が混ざっているため、作り直した下書きに立替者を引き継げない書類の数 */
  mixedAdvancerDocumentCount: number;
}

interface RereadEntry {
  id: string;
  status: "draft" | "approved" | "published";
  documentId: string | null;
  /** 立替者。読み直しで作り直す下書きに引き継げるか判定するために見る */
  advancedBy: string | null;
}

/** 読み直し指示を検証する。前後の空白は落とし、空なら受け付けない */
export function validateRereadInstruction(value: string): ResearchFundResult<string> {
  const instruction = value.trim();
  if (instruction.length === 0) {
    return invalidResearchFundResult(
      "instruction",
      RF_ERROR_CODES.INVALID_REREAD_INSTRUCTION,
      "どう読み直すかの指示を入力してください",
    );
  }
  if (instruction.length > REREAD_INSTRUCTION_MAX_LENGTH) {
    return invalidResearchFundResult(
      "instruction",
      RF_ERROR_CODES.INVALID_REREAD_INSTRUCTION,
      `指示は${REREAD_INSTRUCTION_MAX_LENGTH}文字以内で入力してください`,
    );
  }
  return { status: "valid", value: instruction };
}

/**
 * 候補の書類から読み直す書類を決める。確認済・公開中の仕訳を 1 件でも含む書類は外す
 * （読み直しは書類単位で下書きを置き換えるため、確認済の仕訳を巻き込まない）。
 */
export function planReread(candidates: readonly RereadCandidate[]): ResearchFundResult<RereadPlan> {
  const documentIds = [
    ...new Set(
      candidates
        .filter((candidate) => !candidate.hasReviewedEntries)
        .map((candidate) => candidate.documentId),
    ),
  ];
  const excludedCount = new Set(
    candidates
      .filter((candidate) => candidate.hasReviewedEntries)
      .map((candidate) => candidate.documentId),
  ).size;
  if (documentIds.length > SCAN_BATCH_MAX_DOCUMENTS) {
    return invalidResearchFundResult(
      "entryIds",
      RF_ERROR_CODES.INVALID_DOCUMENT,
      `1回に読み直せる書類は${SCAN_BATCH_MAX_DOCUMENTS}件までです（${documentIds.length}件が対象です）`,
    );
  }
  return { status: "valid", value: { documentIds, excludedCount } };
}

export function previewReread(
  selected: readonly RereadEntry[],
  entries: readonly RereadEntry[],
): RereadPreview {
  const drafts = selected.filter((entry) => entry.status === "draft");
  const documentIds = new Set(
    drafts.flatMap((entry) => (entry.documentId === null ? [] : [entry.documentId])),
  );
  const excluded = new Set(
    entries
      .filter(
        (entry) =>
          entry.documentId !== null &&
          documentIds.has(entry.documentId) &&
          entry.status !== "draft",
      )
      .map((entry) => entry.documentId),
  );
  const targets = [...documentIds].filter((documentId) => !excluded.has(documentId));
  const rebuilt = entries.filter(
    (entry) =>
      entry.status === "draft" && entry.documentId !== null && targets.includes(entry.documentId),
  );
  return {
    documentCount: targets.length,
    draftCount: rebuilt.length,
    excludedDocumentCount: excluded.size,
    withoutDocumentCount: drafts.filter((entry) => entry.documentId === null).length,
    mixedAdvancerDocumentCount: targets.filter(
      (documentId) =>
        inheritedAdvancedBy(
          rebuilt.filter((entry) => entry.documentId === documentId).map((e) => e.advancedBy),
        ).mixed,
    ).length,
  };
}
