"use client";
import { useRef, useState } from "react";
import { ArrowSquareOut, ArrowsOut, Paperclip } from "@phosphor-icons/react/dist/ssr";
import { Button, Dialog, DialogContent, DialogTitle } from "@/client/components/ui";
import { SCAN_DOCUMENT_MIME_TYPES } from "@/server/contexts/research-fund/domain/models/scan-batch";

const pillClassName =
  "inline-flex h-[26px] cursor-pointer items-center gap-1 rounded-full border border-border bg-card px-2.5 text-[11px] font-bold transition-colors duration-150 ease-out outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

/**
 * 詳細カードの領収書プレビュー。小さく出し、「拡大」でダイアログに大きく表示（Esc で閉じる）、
 * 「原寸」で新しいタブに開く。書類の無い仕訳と支給は、その旨だけを出す。
 * 書類の無い仕訳に領収書を紐づけられるとき（onAttach を渡したとき）は、ファイルを選ぶボタンも出す。
 */
export function JournalDocumentPreview({
  grant,
  documentUrl,
  pending = false,
  onAttach,
}: {
  grant: boolean;
  documentUrl?: string;
  pending?: boolean;
  /** 書類の無い仕訳に領収書ファイルを紐づける。紐づけられない仕訳では渡さない */
  onAttach?: (file: File) => void;
}) {
  const [open, setOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  if (grant || !documentUrl)
    return (
      <div className="flex min-h-14 shrink-0 flex-col items-center justify-center gap-1.5 rounded-md border border-dashed px-3 py-2 text-center text-xs text-muted-foreground">
        {grant
          ? "支給（金額・項目名は支給の月から決まるため変更できません）"
          : "領収書なし（手動作成）"}
        {!grant && onAttach && (
          <>
            <Button
              type="button"
              variant="outline"
              size="xs"
              disabled={pending}
              title="あとから届いた領収書（JPG・PNG・PDF）をこの仕訳に紐づけます"
              onClick={() => fileInput.current?.click()}
            >
              <Paperclip aria-hidden />
              領収書を紐づける
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept={SCAN_DOCUMENT_MIME_TYPES.join(",")}
              aria-label="紐づける領収書ファイル"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                // 同じファイルを選び直しても onChange が起きるように、選択を毎回空に戻す
                e.target.value = "";
                if (file) onAttach(file);
              }}
            />
          </>
        )}
      </div>
    );
  return (
    <div className="relative h-[168px] shrink-0 overflow-hidden rounded-md border border-disabled-border bg-muted-foreground">
      <iframe key={documentUrl} title="領収書プレビュー" src={documentUrl} className="size-full" />
      <div className="absolute right-2 bottom-2 flex gap-1.5">
        <button type="button" className={pillClassName} onClick={() => setOpen(true)}>
          <ArrowsOut aria-hidden className="size-3.5" />
          拡大
        </button>
        <a href={documentUrl} target="_blank" rel="noopener noreferrer" className={pillClassName}>
          <ArrowSquareOut aria-hidden className="size-3.5" />
          原寸
        </a>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          aria-describedby={undefined}
          className="flex h-[85vh] w-[min(960px,90vw)] max-w-none flex-col gap-3 p-4 sm:max-w-none"
        >
          <DialogTitle className="text-sm font-bold">領収書</DialogTitle>
          <iframe
            title="領収書（拡大）"
            src={documentUrl}
            className="min-h-0 w-full flex-1 rounded-md border border-border-soft"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
