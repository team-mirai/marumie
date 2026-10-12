import { Warning } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/client/lib";
import type { DuplicateDocument } from "@/server/contexts/research-fund/domain/models/duplicate-document";

/**
 * 同じ領収書を二重にスキャンした可能性があることを知らせる。相手の書類を別タブで開ける。
 * 警告のみで、読み取り・確認済にする操作は止めない。
 */
export function DuplicateDocumentWarning({
  duplicates,
  bookId,
  politicianId,
  className,
}: {
  duplicates: readonly DuplicateDocument[];
  bookId: string;
  politicianId: string;
  className?: string;
}) {
  if (duplicates.length === 0) return null;
  return (
    <div
      role="note"
      aria-label="同じ内容の書類"
      className={cn("flex items-start gap-1.5 text-xs text-destructive", className)}
    >
      <Warning aria-hidden className="mt-px size-4 shrink-0" />
      <p>
        同じ内容（日付・合計金額・発行元）の書類が既にあります。二重にスキャンしていないか確認してください：
        {duplicates.map((duplicate, index) => (
          <span key={duplicate.documentId}>
            {index > 0 && "、"}
            <a
              href={`/api/research-fund/documents/${duplicate.documentId}?bookId=${bookId}&politicianId=${politicianId}`}
              target="_blank"
              rel="noreferrer"
              className="font-latin underline underline-offset-2"
            >
              {duplicate.originalFilename}
            </a>
            （<span className="font-latin">{duplicate.date.replaceAll("-", ".")}</span>・
            <span className="font-latin">¥{duplicate.totalAmount.toLocaleString("ja-JP")}</span>）
          </span>
        ))}
      </p>
    </div>
  );
}
