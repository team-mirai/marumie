import { isSerialId } from "@/server/contexts/research-fund/domain/models/entity-id";

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
  versions: readonly PromptVersion[];
  /** エディタの初期値。版が 1 つも無ければデフォルトテンプレート */
  body: string;
  /** 有効版の版番号。版が 1 つも無ければ null */
  activeVersion: number | null;
  /** 保存すると採番される版番号 */
  nextVersion: number;
  /** システムが自動で付加する部分（参照専用） */
  automaticPrompt: string;
}

/** テスト実行の書類 select に出す 1 件（原本は署名 URL 無しでサーバー側だけが読む） */
export interface PromptTestDocument {
  id: string;
  originalFilename: string;
  mime: string;
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

/** プロンプトの持ち主（議員）の ID を検証する。不正ならリポジトリを呼ぶ前に弾く */
export function validatePromptOwnerId(id: string): void {
  if (!isSerialId(id)) throw new PromptError("IDが不正です");
}

/** 巻き戻し先の版番号を検証する。版は 1 からの連番 */
export function validatePromptVersion(version: unknown): number {
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1)
    throw new PromptError("版の指定が不正です");
  return version;
}

/** 行ごとの出現回数。同じ行が複数回現れる本文でも増減を数えられるようにする */
function countLines(body: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const line of body.split("\n")) counts.set(line, (counts.get(line) ?? 0) + 1);
  return counts;
}

/**
 * 版履歴に出す変更要旨。
 * 変更要旨を保存する列は無いため、前版との行差分から機械的に導出する。
 */
export function summarizePromptChange(body: string, previousBody: string | null): string {
  if (previousBody === null) return "初版";
  if (previousBody === body) return "本文の変更なし";
  const previousCounts = countLines(previousBody);
  const counts = countLines(body);
  let added = 0;
  let removed = 0;
  for (const line of new Set([...previousCounts.keys(), ...counts.keys()])) {
    const diff = (counts.get(line) ?? 0) - (previousCounts.get(line) ?? 0);
    if (diff > 0) added += diff;
    else removed -= diff;
  }
  if (added === 0 && removed === 0) return "行の並び替え";
  return [added > 0 && `+${added}行`, removed > 0 && `−${removed}行`].filter(Boolean).join("・");
}

/**
 * 議員の読み取りプロンプトの版履歴。
 * どの版を編集対象にするか・次の版番号・各版の変更要旨は、保存された列ではなく履歴から導出する。
 */
export class PromptHistory {
  private constructor(readonly versions: readonly PromptVersion[]) {}

  /** version の降順に並んだ記録から版履歴を組み立てる */
  static fromRecords(records: readonly PromptRecord[]): PromptHistory {
    return new PromptHistory(
      records.map((record, index) => ({
        ...record,
        // records は version の降順なので、次の要素が前の版にあたる
        summary: summarizePromptChange(record.body, records[index + 1]?.body ?? null),
      })),
    );
  }

  /** 編集・表示の対象になる版。有効版があればそれ、無ければ最新版。版が 1 つも無ければ null */
  get active(): PromptVersion | null {
    return this.versions.find((version) => version.isActive) ?? this.versions[0] ?? null;
  }

  /** 保存すると採番される版番号。版は 1 からの連番 */
  get nextVersion(): number {
    return (this.versions[0]?.version ?? 0) + 1;
  }

  /**
   * 版履歴の画面に出す内容。
   * 版が 1 つも無いうちは編集対象が無いため、渡された初期テンプレートから書き始める。
   */
  overview(defaultBody: string): Omit<PromptOverview, "automaticPrompt"> {
    const active = this.active;
    return {
      versions: this.versions,
      body: active?.body ?? defaultBody,
      activeVersion: active?.version ?? null,
      nextVersion: this.nextVersion,
    };
  }
}
