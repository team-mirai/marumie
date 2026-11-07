import { settlementRejection } from "@/server/contexts/research-fund/domain/models/advance";
import { JournalEntry } from "@/server/contexts/research-fund/domain/models/journal-entry";
import {
  isAccountUnconfirmed,
  type JournalEdit,
  type ReviewEntry,
} from "@/server/contexts/research-fund/domain/models/journal-review";

/**
 * 仕訳の確認画面の各操作を、その仕訳にしてよいかの判定。
 *
 * 1 件の操作とまとめて操作が同じ判定を使い、同じ仕訳に対する可否が経路によって食い違わないようにする。
 * 同時更新の検出（updatedAt の照合）は取得の段取りなので、ここでは扱わない。
 */

/** 判定に使う仕訳の最小の形 */
export type OperableEntry = Pick<
  ReviewEntry,
  | "description"
  | "source"
  | "status"
  | "advancedBy"
  | "settledAt"
  | "entryDate"
  | "amount"
  | "accountKey"
  | "id"
  // 領収書をあとから紐づけられるのは書類の無い仕訳だけ
  | "documentId"
  // 徴し難かった事情は徴難の仕訳だけが持てる
  | "receiptAbsent"
  // 支給の編集では、支給日以外が変わっていないかを備考まで含めて見る
  | "note"
  | "memo"
>;

/**
 * 操作を受け付けない理由（利用者に見せる文）。
 * 1 件の操作では one を、まとめて操作では仕訳の項目名を含む many を見せる。
 */
export interface OperationRejection {
  one: string;
  many: string;
  /**
   * まとめて操作では拒否ではなく除外として扱う理由。
   * 要確認の下書きが 1 件混ざっただけで、選んだ全件が止まらないようにする。
   */
  bulkExcludable?: true;
}

/** まとめて操作で支給を選んだときの理由。支給は一覧で選べないので、画面と食い違った選択として扱う */
const UNSUPPORTED_ENTRY = "この画面で扱えない仕訳が選ばれています";

function published(entry: OperableEntry): OperationRejection | null {
  if (entry.status !== "published") return null;
  return {
    one: "公開中の仕訳は編集・破棄できません",
    many: `「${entry.description}」は公開中です`,
  };
}

function settled(entry: OperableEntry, one: string): OperationRejection | null {
  if (entry.settledAt === null) return null;
  return { one, many: `「${entry.description}」は精算済です（先に未精算に戻してください）` };
}

export const JournalOperation = {
  /**
   * 内容の編集。精算後に金額が変わると精算した額と記録が合わなくなるので、先に未精算に戻させる。
   * 確認済の仕訳は科目を要確認に戻せない（確認済と科目未確定が同時に成り立つ状態を作らない）。
   * accountKey には保存する科目を渡す（省略すると今の科目で判定する）。
   */
  edit(
    entry: OperableEntry,
    amount: number,
    accountKey: string = entry.accountKey,
  ): OperationRejection | null {
    const rejection = published(entry);
    if (rejection) return rejection;
    if (entry.status === "approved" && isAccountUnconfirmed(accountKey))
      return {
        one: "科目を確定してから確認済にしてください",
        many: `「${entry.description}」は科目が要確認です`,
      };
    return entry.amount === amount
      ? null
      : settled(entry, "精算済の仕訳は金額を変更できません。先に未精算に戻してください");
  },
  /**
   * 支給の内容の編集。支給は支給日だけを直せる。
   * 金額・項目名・科目・備考は支給の登録時に月から決まるため、ここでは受け付けない。
   * 支給の「どの月の分か」は仕訳日から判定するので、月をまたぐと同じ月を二重登録できてしまう。
   * そのため変更後の支給日が登録時と同じ条件（その月の中・当選月は当選日以降）を満たすかは
   * buildGrantJournalWrite が判定する。
   * 公開中・同時更新の判定は edit と取得の段取りが行うので、ここでは扱わない。
   */
  editGrant(entry: OperableEntry, input: JournalEdit): OperationRejection | null {
    if (
      input.amount !== entry.amount ||
      input.description !== entry.description ||
      input.accountKey !== entry.accountKey ||
      input.note !== entry.note ||
      input.memo !== entry.memo
    )
      return { one: "支給は支給日だけを変更できます", many: UNSUPPORTED_ENTRY };
    return null;
  },
  /**
   * 確認済にする。支給は下書きを経ずに確認済で作るので対象にならない。
   * 科目が未確定（要確認）なら確認済にできない。編集して確認済にする経路は保存後の科目で判定するので、
   * accountKey に保存する科目を渡す（省略すると今の科目で判定する）。
   */
  approve(entry: OperableEntry, accountKey: string = entry.accountKey): OperationRejection | null {
    const rejection = published(entry);
    if (rejection) return rejection;
    if (entry.source === "grant") return { one: "支給はすでに確認済です", many: UNSUPPORTED_ENTRY };
    const result = JournalEntry.transition(entry, "approved");
    if (result.status === "invalid")
      return {
        one: result.errors[0].message,
        many: `「${entry.description}」は下書きではありません`,
      };
    // 要確認はまとめて操作では除外する。他の理由と同じ拒否にすると、1 件混ざっただけで全体が止まってしまう。
    if (isAccountUnconfirmed(accountKey))
      return {
        one: "科目を確定してから確認済にしてください",
        many: `「${entry.description}」は科目が要確認です`,
        bulkExcludable: true,
      };
    return null;
  },
  /** 下書きに戻す。下書きは金額が確定していないので精算できない。精算済のまま下書きに戻さない */
  revertToDraft(entry: OperableEntry): OperationRejection | null {
    if (entry.source === "grant")
      return { one: "支給は下書きに戻せません", many: UNSUPPORTED_ENTRY };
    if (JournalEntry.transition(entry, "draft").status === "invalid")
      return {
        one: "確認済の仕訳だけを下書きに戻せます",
        many:
          entry.status === "published"
            ? `「${entry.description}」は公開中です`
            : `「${entry.description}」は確認済ではありません`,
      };
    return settled(entry, "精算済の仕訳は下書きに戻せません。先に未精算に戻してください");
  },
  /** 破棄。精算済を消すと、精算した額と残る記録が合わなくなる */
  discard(entry: OperableEntry): OperationRejection | null {
    const rejection = published(entry);
    if (rejection) return rejection;
    if (entry.source === "grant") return { one: "支給は破棄できません", many: UNSUPPORTED_ENTRY };
    return settled(entry, "精算済の仕訳は破棄できません。先に未精算に戻してください");
  },
  /** 公開中の仕訳を確認済に戻す（取り下げ）。支給も取り下げられる */
  unpublish(entry: OperableEntry): OperationRejection | null {
    if (entry.status !== "published")
      return {
        one: "公開中の仕訳だけを確認済に戻せます",
        many: `「${entry.description}」は公開中ではありません`,
      };
    return null;
  },
  /**
   * 立替者の設定・解除。立替は公開内容に影響しない事務所内の管理情報なので、公開中の仕訳でも変更できる。
   * 支給は立替情報を持てない
   */
  setAdvancedBy(entry: OperableEntry): OperationRejection | null {
    if (entry.source === "grant")
      return {
        one: "支給には立替者を設定できません",
        many: "立替者を設定できない仕訳（支給・返還など）が選ばれています",
      };
    return settled(entry, "精算済の仕訳は立替者を変更できません。先に未精算に戻してください");
  },
  /**
   * 支払先の紐づけ・解除。支払先は議員課提出用の帳簿の情報で公開内容に影響しないので、
   * 公開中・精算済の仕訳でも変更できる。支給は支払先を持たない
   */
  setPayee(entry: OperableEntry): OperationRejection | null {
    if (entry.source === "grant")
      return {
        one: "支給には支払先を設定できません",
        many: "支払先を設定できない仕訳（支給・返還など）が選ばれています",
      };
    return null;
  },
  /**
   * 徴難の付け外し。徴難は議員課提出用の帳簿の情報で公開内容に影響しないので、
   * 公開中・精算済の仕訳でも変更できる。書類の有無は問わない。支給は徴難にしない（DB の CHECK 制約と一致させる）
   */
  setReceiptAbsent(entry: OperableEntry): OperationRejection | null {
    if (entry.source === "grant")
      return {
        one: "支給は徴難にできません",
        many: "徴難にできない仕訳（支給・返還など）が選ばれています",
      };
    return null;
  },
  /**
   * 領収書等を徴し難かった事情の入力・変更・削除。事情も議員課提出用の帳簿の情報で公開内容に影響しないので、
   * 公開中・精算済の仕訳でも変更できる。徴難の仕訳だけが事情を持てる（DB の CHECK 制約と一致させる）
   */
  setReceiptAbsenceReason(entry: OperableEntry): OperationRejection | null {
    if (entry.source === "grant")
      return {
        one: "支給には徴し難かった事情を書けません",
        many: "徴し難かった事情を書けない仕訳（支給・返還など）が選ばれています",
      };
    if (!entry.receiptAbsent)
      return {
        one: "徴難の仕訳だけに徴し難かった事情を書けます。先に徴難にしてください",
        many: `「${entry.description}」は徴難ではありません`,
      };
    return null;
  },
  /**
   * 書類の無い支出の仕訳に、あとから領収書を紐づける。
   * 公開ページは公開中の仕訳の書類をそのまま領収書として出すので、公開中に紐づけると即座に公開されてしまう。
   * そのため公開中は対象にせず、編集と同じく下書き・確認済に戻してから紐づけさせる。
   * 書類の差し替え・取り外しはしないので、すでに書類がある仕訳も対象にしない
   */
  attachDocument(entry: OperableEntry): OperationRejection | null {
    if (entry.source === "grant")
      return { one: "支給には領収書を紐づけられません", many: UNSUPPORTED_ENTRY };
    if (entry.status === "published")
      return {
        one: "公開中の仕訳には領収書を紐づけられません。先に確認済に戻してください",
        many: `「${entry.description}」は公開中です`,
      };
    if (entry.documentId !== null)
      return {
        one: "すでに書類のある仕訳には領収書を紐づけられません",
        many: `「${entry.description}」には書類があります`,
      };
    return null;
  },
  /**
   * 書類のある支出の仕訳の、書類ファイルを差し替える（例: 納品書で登録しておき、届いた正式な領収書に替える）。
   * 書類は仕訳の内容と独立に差し替え、読み取りはやり直さない。公開中に差し替えると公開内容が即座に変わるので、
   * 紐づけと同じく公開中は対象にしない。同じ書類に紐づく別の公開中の仕訳の判定はリポジトリが行う
   */
  replaceDocument(entry: OperableEntry): OperationRejection | null {
    if (entry.source === "grant")
      return { one: "支給には書類がありません", many: UNSUPPORTED_ENTRY };
    if (entry.status === "published")
      return {
        one: "公開中の仕訳の書類は差し替えられません。先に確認済に戻してください",
        many: `「${entry.description}」は公開中です`,
      };
    if (entry.documentId === null)
      return {
        one: "書類の無い仕訳です。差し替えではなく領収書を紐づけてください",
        many: `「${entry.description}」には書類がありません`,
      };
    return null;
  },
  /** 精算。精算できる立替の条件は settlementRejection が持つ */
  settle(entry: OperableEntry): OperationRejection | null {
    if (entry.source === "grant")
      return {
        one: "支給は精算できません",
        many: "精算できない仕訳（支給・返還など）が選ばれています",
      };
    const reason = settlementRejection(entry);
    return reason ? { one: reason, many: reason } : null;
  },
  /** 未精算に戻す（精算の誤操作の取り消し） */
  unsettle(entry: OperableEntry): OperationRejection | null {
    if (entry.source === "grant") return { one: "支給は精算していません", many: UNSUPPORTED_ENTRY };
    if (entry.settledAt === null)
      return {
        one: "精算済の仕訳だけを未精算に戻せます",
        many: `「${entry.description}」は未精算です`,
      };
    return null;
  },
};
