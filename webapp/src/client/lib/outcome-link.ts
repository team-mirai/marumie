import { snsKindOf } from "@/client/lib/sns-kind";

/** 用途の報告リンクのうち、名前を文字ではなくアイコンで出す SNS */
export type OutcomeSnsKind = "YouTube" | "X";

interface OutcomeLinkView {
  /** アイコンで出す SNS。どれでもなければ null（文字だけ） */
  sns: OutcomeSnsKind | null;
  /** 表示する文字。SNS の名前はアイコンで出すので、「(Youtube)」「(X)」などを取り除く */
  text: string;
  /** スクリーンリーダー向けの名前（例: 「参加報告（YouTube、別タブで開きます）」） */
  ariaLabel: string;
}

const SNS_NAME_IN_PARENS = /\s*[（(](youtube|x|twitter)[)）]\s*/i;
const LEADING_YOUTUBE = /^youtube\s*/i;

/** 報告リンクのラベルと URL から、アイコン・表示する文字・読み上げの名前を決める */
export function outcomeLinkOf(label: string, url: string): OutcomeLinkView {
  const kind = snsKindOf(url);
  const sns = kind === "YouTube" || kind === "X" ? kind : null;
  const text = sns
    ? label.replace(SNS_NAME_IN_PARENS, "").replace(LEADING_YOUTUBE, "").trim() || label
    : label;
  return { sns, text, ariaLabel: `${text}（${sns ?? "外部サイト"}、別タブで開きます）` };
}
