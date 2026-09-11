export const PROMPT_BODY_MAX_LENGTH = 20000;

/** 読み取りプロンプトの 1 版。version は議員ごとに 1 から連番。 */
export interface PromptRecord {
  id: string;
  version: number;
  body: string;
  isActive: boolean;
  /** ISO 8601。画面では YYYY.MM.DD で表示する */
  updatedAt: string;
  /** この版を使ったスキャンジョブ数 */
  jobCount: number;
}

/** 版履歴に出す 1 行。変更要旨は前版との差分から導出する（本文以外の列は持たない） */
export interface PromptVersion extends PromptRecord {
  summary: string;
}

export interface PromptOverview {
  versions: PromptVersion[];
  /** エディタの初期値。版が 1 つも無ければデフォルトテンプレート */
  body: string;
  /** 有効版の版番号。版が 1 つも無ければ null */
  activeVersion: number | null;
  /** 保存すると採番される版番号 */
  nextVersion: number;
  /** システムが自動で付加する部分（参照専用） */
  automaticPrompt: string;
}

export class PromptError extends Error {}

/**
 * 保存できる本文に正規化する。
 * 末尾の空白だけを落とし、本文中の改行・インデントはプロンプトの意味を変えるため保つ。
 */
export function normalizePromptBody(body: unknown): string {
  if (typeof body !== "string") throw new PromptError("プロンプト本文を入力してください");
  const normalized = body.trim();
  if (normalized.length === 0) throw new PromptError("プロンプト本文を入力してください");
  if (normalized.length > PROMPT_BODY_MAX_LENGTH)
    throw new PromptError(`プロンプト本文は${PROMPT_BODY_MAX_LENGTH}文字以内で入力してください`);
  return normalized;
}

/**
 * 版履歴に出す変更要旨。
 * 変更要旨を保存する列は無いため、前版との行差分から機械的に導出する。
 */
export function summarizePromptChange(body: string, previousBody: string | null): string {
  if (previousBody === null) return "初版";
  if (previousBody === body) return "本文の変更なし";
  const previousLines = previousBody.split("\n");
  const lines = body.split("\n");
  const added = lines.filter((line) => !previousLines.includes(line)).length;
  const removed = previousLines.filter((line) => !lines.includes(line)).length;
  if (added === 0 && removed === 0) return "行の並び替え";
  return [added > 0 && `+${added}行`, removed > 0 && `−${removed}行`].filter(Boolean).join("・");
}
