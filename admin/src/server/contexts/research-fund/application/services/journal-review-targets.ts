import "server-only";
import type { OperationRejection } from "@/server/contexts/research-fund/domain/models/journal-operation";
import {
  JournalReviewError,
  type ReviewEntry,
} from "@/server/contexts/research-fund/domain/models/journal-review";
import type { JournalReviewRepository } from "@/server/contexts/research-fund/domain/repositories/journal-review-repository.interface";

/** 画面から送られる操作対象。updatedAt は同時更新の検出に使う */
export type JournalTarget = { id: string; updatedAt: string };

/**
 * 仕訳の確認画面の操作に共通する段取り（対象の取得・同時更新の検出・ドメインの判定の適用）。
 * 1 件の操作とまとめて操作の usecase が同じ判定を共有するために、ここに置く。
 */

/** 1 件の操作の対象を取得し、同時更新を検出してから、まとめて操作と同じ判定（judge）を適用する */
export async function acceptJournalEntry(
  repository: JournalReviewRepository,
  bookId: string,
  id: string,
  updatedAt: string,
  judge: (entry: ReviewEntry) => OperationRejection | null,
) {
  const entry = await repository.find(bookId, id);
  if (!entry) throw new JournalReviewError("仕訳が見つかりません");
  if (entry.updatedAt !== updatedAt)
    throw new JournalReviewError("別の操作で更新されました。画面を再読み込みしてください");
  const rejection = judge(entry);
  if (rejection) throw new JournalReviewError(rejection.one);
  return entry;
}

/**
 * まとめて操作する仕訳を重複を畳んで取得し、全件に 1 件の操作と同じ判定（judge）を適用する。
 * 受け付けない仕訳が 1 件でもあれば何も変更せず、理由を利用者に返す（一部だけ変わる中途半端な状態にしない）。
 * 取得できない仕訳（支給・この画面で扱えない形式・別帳簿）は黙って除外せず、missing を理由に拒否する。
 *
 * ただし除外として扱う理由（OperationRejection.bulkExcludable）の仕訳は全体を止めず、excluded に分けて返す。
 * 呼び出し側は accepted だけを変更し、excluded の件数を利用者に伝える。
 */
export async function acceptJournalEntries(
  repository: JournalReviewRepository,
  bookId: string,
  targets: readonly JournalTarget[],
  judge: (entry: ReviewEntry) => OperationRejection | null,
  messages: { action: string; cannot: string; notDone: string; missing?: string },
) {
  const unique = [...new Map(targets.map((target) => [target.id, target])).values()];
  if (unique.length === 0) throw new JournalReviewError(`${messages.action}仕訳を選んでください`);
  if (unique.some((target) => !/^[1-9]\d*$/.test(target.id)))
    throw new JournalReviewError("仕訳IDが不正です");
  const found = new Map(
    (
      await repository.findMany(
        bookId,
        unique.map((target) => target.id),
      )
    ).map((entry) => [entry.id, entry]),
  );
  const accepted: ReviewEntry[] = [];
  const excluded: ReviewEntry[] = [];
  const rejected: string[] = [];
  for (const target of unique) {
    const entry = found.get(target.id);
    if (!entry) {
      rejected.push(messages.missing ?? "この画面で扱えない仕訳が選ばれています");
      continue;
    }
    if (entry.updatedAt !== target.updatedAt) {
      rejected.push(`「${entry.description}」は別の操作で更新されました`);
      continue;
    }
    const rejection = judge(entry);
    if (!rejection) accepted.push(entry);
    else if (rejection.bulkExcludable) excluded.push(entry);
    else rejected.push(rejection.many);
  }
  if (rejected.length > 0) throw rejectMany(rejected, messages.cannot, messages.notDone);
  return { accepted, excluded };
}

function rejectMany(rejected: readonly string[], cannot: string, notDone: string) {
  const reasons = [...new Set(rejected)];
  const listed = reasons.slice(0, 5).join(" / ");
  const rest = reasons.length > 5 ? ` 他${reasons.length - 5}件` : "";
  return new JournalReviewError(
    `${cannot}仕訳があるため、まとめて${notDone}: ${listed}${rest}。画面を再読み込みしてください`,
  );
}
