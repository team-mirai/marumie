import type { DocumentMaskingStatus } from "@/server/contexts/research-fund/domain/models/document-masking";
import { isSerialId } from "@/server/contexts/research-fund/domain/models/entity-id";
import { JournalEntry } from "@/server/contexts/research-fund/domain/models/journal-entry";
import type { ResearchFundCategory, ResearchFundRow } from "@/shared/research-fund/aggregation";

/** 仕訳に付いた書類の公開用の版の状態（#1803）。webapp は原本でなく公開用の版を配信する */
export interface PublicationDocument {
  maskingStatus: DocumentMaskingStatus;
  /** 公開用の版のファイルがあるか */
  hasMaskedVersion: boolean;
}

/** 公開の候補として選べる確認済・未公開の仕訳。集計にそのまま渡せるよう行を兼ねる。 */
export interface PublishCandidate extends ResearchFundRow {
  id: string;
  description: string;
  /** 付いている書類。書類の無い仕訳は null */
  document: PublicationDocument | null;
  /** 書類の公開用の版が無いため公開できない理由（利用者に見せる文）。公開できれば null */
  documentRejection: string | null;
}

/** 公開画面が描く before / after の材料。before は公開済みだけ、after は候補を足して集計する。 */
export interface PublicationSnapshot {
  published: ResearchFundRow[];
  candidates: PublishCandidate[];
  accounts: Record<string, ResearchFundCategory>;
  publishedThrough: string | null;
}

/** 公開の可否判定に必要な最小限の仕訳。状態遷移は JournalEntry が持つ。 */
export interface PublishableEntry extends JournalEntry {
  id: string;
  entryDate: string;
  /** 公開できない理由を利用者に示すときに、どの仕訳かを伝えるために使う */
  description: string;
  /** 付いている書類。書類の無い仕訳は null */
  document: PublicationDocument | null;
  /** 集計行に射影したときの行数。公開の候補かどうかの判定に使う。 */
  rowCount: number;
}

export class PublicationError extends Error {}

function monthEnd(date: string): string {
  const [year, month] = [Number(date.slice(0, 4)), Number(date.slice(5, 7))];
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

export const Publication = {
  /** 公開する仕訳の選び方を受け付けない理由（利用者に見せる文）。重複は 1 件にまとめてから渡す */
  selectionRejection(ids: readonly string[]): string | null {
    if (ids.length === 0) return "公開する仕訳を選んでください";
    if (ids.some((id) => !isSerialId(id))) return "仕訳IDが不正です";
    return null;
  },

  /** その仕訳を公開させない理由（利用者に見せる文）。公開してよければ null */
  entryRejection(entry: PublishableEntry): string | null {
    // 下書きは公開できない。確認済 → 公開済 の遷移だけを JournalEntry が許す。
    if (JournalEntry.transition(entry, "published").status === "invalid")
      return "確認済の仕訳だけを公開できます。下書きは先に確認済にしてください";
    // 画面のチェックリストに出ない仕訳は before / after で確認できないので公開させない。
    if (!Publication.isPublishable(entry.rowCount))
      return "この画面で公開できない仕訳が含まれています。画面を再読み込みしてください";
    return Publication.documentRejection(entry.document);
  },

  /**
   * 書類の公開用の版が無いため公開させない理由（利用者に見せる文）。公開してよければ null。
   * webapp は原本を配信せず公開用の版だけを配信するので、版が作成済みでない書類の付いた仕訳は公開させない。
   * 判定は版が作成済みかどうかだけで、人間の承認は求めない（#1803）。書類の無い仕訳は公開できる。
   * 作り直しの依頼中・失敗した書類は、前の版が残っていても作成済みとはみなさない（webapp も配信しない）。
   */
  documentRejection(document: PublicationDocument | null): string | null {
    if (document === null) return null;
    if (document.maskingStatus === "succeeded" && document.hasMaskedVersion) return null;
    switch (document.maskingStatus) {
      case "running":
        return "書類の公開用の版を作成中です。できあがるまで公開できません";
      case "failed":
        return "書類の公開用の版の作成に失敗しています。仕訳の詳細から作り直してください";
      default:
        return "書類の公開用の版がまだ作られていません。帳簿の画面を開いたままにすると順に作られます";
    }
  },

  /**
   * 公開の候補にできるのは「費用1行／収入1行」に射影できる仕訳だけ。
   * それ以外はこの画面の before / after に表せないため、候補に出さず公開もさせない。
   */
  isPublishable(rowCount: number): boolean {
    return rowCount === 1;
  },

  /**
   * 公開範囲（published_through）を、公開した仕訳の最新月末まで進める。
   * 既に先まで公開している場合は後退させない（過去分の追加公開で表記が戻らないように）。
   */
  advancePublishedThrough(current: string | null, dates: readonly string[]): string | null {
    if (dates.length === 0) return current;
    const latest = monthEnd(dates.reduce((a, b) => (a > b ? a : b)));
    return current && current > latest ? current : latest;
  },

  /**
   * 仕訳を取り下げたあとの公開範囲。残っている公開中の仕訳の最新月末を超えないよう戻す。
   * 公開中の仕訳が残っていなければ未設定にする。現在値より先へ進めることはしない（未設定なら未設定のまま）。
   */
  retreatPublishedThrough(current: string | null, latestPublished: string | null): string | null {
    if (latestPublished === null || current === null) return null;
    const limit = monthEnd(latestPublished);
    return current < limit ? current : limit;
  },
};
