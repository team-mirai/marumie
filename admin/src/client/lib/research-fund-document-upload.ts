import {
  type DocumentUpload,
  documentUploadSizeError,
} from "@/server/contexts/research-fund/domain/models/document-upload";
import { prepareDocumentUploads } from "@/server/contexts/research-fund/presentation/actions/prepare-document-uploads";

type UploadResult =
  | { success: true; uploads: DocumentUpload[] }
  | { success: false; error: string };

/** 上限を超えるファイルがあれば、アップロードする前に理由を返す。通れば null */
export function documentFileSizeError(files: File[]): string | null {
  for (const file of files) {
    const error = documentUploadSizeError(file.size, file.name);
    if (error) return error;
  }
  return null;
}

/**
 * 調研費の書類を、署名付き URL で原本のバケットへ直接置く（#1824）。
 * ファイル本体は Vercel の関数（リクエストボディ 4.5MB 上限）を通さず、
 * 登録のサーバーアクションにはここで返すキーと元ファイル名だけを渡す。
 */
export async function uploadResearchFundDocuments(
  target: { politicianId: string; bookId: string },
  files: File[],
): Promise<UploadResult> {
  const sizeError = documentFileSizeError(files);
  if (sizeError) return { success: false, error: sizeError };
  const prepared = await prepareDocumentUploads(
    target.politicianId,
    target.bookId,
    files.map((file) => ({ mime: file.type, size: file.size })),
  );
  if (!prepared.success) return prepared;
  const responses = await Promise.all(
    files.map((file, index) =>
      fetch(prepared.targets[index].uploadUrl, {
        method: "PUT",
        headers: { "content-type": file.type, "x-upsert": "false" },
        body: file,
      }),
    ),
  );
  const failed = responses.findIndex((response) => !response.ok);
  if (failed !== -1)
    return {
      success: false,
      error: `書類のアップロードに失敗しました（${files[failed].name}・${responses[failed].status}）`,
    };
  return {
    success: true,
    uploads: files.map((file, index) => ({
      uploadKey: prepared.targets[index].uploadKey,
      originalFilename: file.name,
    })),
  };
}
