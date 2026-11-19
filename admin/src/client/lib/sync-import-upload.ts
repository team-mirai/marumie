import { validateSyncImportFileSize } from "@/server/contexts/shared/domain/models/sync-import-file";
import type { PrepareSyncImportUploadResponse } from "@/server/contexts/shared/presentation/actions/prepare-sync-import-upload";

/**
 * Server Action がエラーページ（HTML）を受け取ったときなどに Next.js が投げる汎用メッセージを、
 * 原因の見当が付く文言に置き換える。関数の実行時間・メモリの上限で打ち切られたときに起きる。
 */
export function toUnexpectedErrorMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : "";
  if (!message || message.includes("An unexpected response was received from the server")) {
    return `${fallback}。サーバーから応答がありませんでした（処理時間やメモリの上限を超えた可能性があります）`;
  }
  return `${fallback}: ${message}`;
}

/** ストレージが返すエラー本文（JSON の message）を取り出す。読めなければ HTTP ステータスだけ返す。 */
async function describeUploadFailure(response: Response): Promise<string> {
  const body = await response.text().catch(() => "");
  try {
    const parsed = JSON.parse(body) as { message?: unknown };
    if (typeof parsed.message === "string") return `${response.status}: ${parsed.message}`;
  } catch {
    // JSON でなければステータスだけ見せる
  }
  return String(response.status);
}

type UploadSyncImportFileResult = { ok: true; storageKey: string } | { ok: false; error: string };

/**
 * 同期用 JSON をストレージへ置き、確認・取り込みで使うキーを返す。
 * ファイル本体は Vercel の関数（リクエストボディ 4.5MB 上限）を通さず、
 * 署名付き URL でストレージへ直接置く。サーバーにはキーだけを渡す。
 */
export async function uploadSyncImportFile(
  file: File,
  prepareUploadAction: (data: { fileSize: number }) => Promise<PrepareSyncImportUploadResponse>,
): Promise<UploadSyncImportFileResult> {
  const sizeError = validateSyncImportFileSize(file.size);
  if (sizeError) return { ok: false, error: sizeError };

  const prepared = await prepareUploadAction({ fileSize: file.size });
  if (!prepared.ok) return { ok: false, error: prepared.error };

  const uploadResponse = await fetch(prepared.target.uploadUrl, {
    method: "PUT",
    headers: { "content-type": "application/json", "x-upsert": "false" },
    body: file,
  });
  if (!uploadResponse.ok) {
    return {
      ok: false,
      error: `ファイルのアップロードに失敗しました（${await describeUploadFailure(uploadResponse)}）`,
    };
  }

  return { ok: true, storageKey: prepared.target.storageKey };
}
