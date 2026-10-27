"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowClockwise, ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
} from "@/client/components/ui";
import { useResearchFundReadOnly } from "@/client/components/research-fund/ResearchFundWriteAccess";
import { cn, researchFundDocumentUrl } from "@/client/lib";
import {
  type DocumentMasking,
  DocumentMaskingPolicy,
  type DocumentMaskingStatus as MaskingStatus,
  MASKING_INSTRUCTION_MAX_LENGTH,
} from "@/server/contexts/research-fund/domain/models/document-masking";
import { requestDocumentMasking } from "@/server/contexts/research-fund/presentation/actions/manage-document-masking";

const STATUS_LABELS: Record<MaskingStatus, string> = {
  pending: "未作成",
  running: "作成中",
  succeeded: "作成済み",
  failed: "失敗",
};

const STATUS_STYLES: Record<MaskingStatus, string> = {
  pending: "border-border-soft text-muted-foreground",
  running: "border-ring text-accent-foreground",
  succeeded: "border-primary bg-primary text-primary-foreground",
  failed: "border-destructive bg-destructive text-white",
};

/** 書類の公開用の版の状態のバッジ（未作成・作成中・作成済み・失敗） */
export function DocumentMaskingBadge({
  status,
  className,
}: {
  status: MaskingStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
        STATUS_STYLES[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

/** バッジと同じ色の点。幅の狭い一覧で、表記の代わりに出す（表記は title と読み上げに回す） */
export function DocumentMaskingDot({
  status,
  className,
}: {
  status: MaskingStatus;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={`公開用の版 ${STATUS_LABELS[status]}`}
      title={`公開用の版 ${STATUS_LABELS[status]}`}
      className={cn(
        "inline-block size-2.5 rounded-full border-2",
        STATUS_STYLES[status],
        className,
      )}
    />
  );
}

/**
 * 公開用の版を作り直せるか。未作成は自動で作られるので、作り直しの依頼は作成済み・失敗の書類だけで受ける
 */
export function canRerequestDocumentMasking(masking: DocumentMasking | undefined): boolean {
  const status = masking?.status ?? "pending";
  return status !== "pending" && DocumentMaskingPolicy.canRequest(status);
}

/**
 * 公開用の版の作り直しの依頼ダイアログ。読み取り画面の一覧と仕訳の詳細カードで共有する。
 * この書類に向けた黒塗りへの追加の指示を任意で添えられる（#1867）。前回付けた指示が最初から入っていて、
 * 書き換え・消去してから依頼できる。空欄のまま依頼すると共通のプロンプトだけで作り直す
 */
export function DocumentMaskingRequestDialog({
  target,
  documentId,
  masking,
  open,
  onOpenChange,
}: {
  target: { politicianId: string; bookId: string };
  documentId: string;
  masking: DocumentMasking | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next);
      }}
    >
      <DialogContent>
        {/* 開くたびに作り直し、入力欄を前回付けた指示に戻す */}
        <DocumentMaskingRequestForm
          target={target}
          documentId={documentId}
          masking={masking}
          pending={pending}
          startTransition={startTransition}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function DocumentMaskingRequestForm({
  target,
  documentId,
  masking,
  pending,
  startTransition,
  onDone,
}: {
  target: { politicianId: string; bookId: string };
  documentId: string;
  masking: DocumentMasking | undefined;
  pending: boolean;
  startTransition: (action: () => Promise<void>) => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const [instruction, setInstruction] = useState(masking?.instruction ?? "");
  const [error, setError] = useState<string | null>(null);
  const length = instruction.trim().length;
  const inputId = `masking-instruction-${documentId}`;

  function request() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await requestDocumentMasking(
          target.politicianId,
          target.bookId,
          documentId,
          instruction,
        );
        if (!result.success) {
          setError(result.error);
          return;
        }
        toast.success("公開用の版を作り直します");
        onDone();
        router.refresh();
      } catch {
        toast.error("通信に失敗しました。再度お試しください");
      }
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {masking?.hasMaskedVersion ? "公開用の版を作り直しますか？" : "公開用の版を作りますか？"}
        </DialogTitle>
        <DialogDescription>
          {masking?.hasMaskedVersion
            ? "できあがると今の公開用の版は置き換わります。"
            : "公開用の版を作ります。"}
          この書類だけに向けた黒塗りの指示を添えられます。指示は書類に保存され、次に作り直すときも最初から入っています。
          空欄のままなら、共通の決まりだけで作り直します。
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <Label htmlFor={inputId}>追加の指示（任意）</Label>
        <Textarea
          id={inputId}
          value={instruction}
          rows={4}
          disabled={pending}
          aria-invalid={error !== null || length > MASKING_INSTRUCTION_MAX_LENGTH}
          placeholder="例：注文者の氏名も黒塗りにしてください"
          onChange={(e) => setInstruction(e.target.value)}
        />
        <p
          className={cn(
            "text-right text-xs text-muted-foreground",
            length > MASKING_INSTRUCTION_MAX_LENGTH && "text-destructive",
          )}
        >
          <span className="font-latin">
            {length} / {MASKING_INSTRUCTION_MAX_LENGTH}
          </span>
          文字
        </p>
        {error !== null && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" disabled={pending} onClick={onDone}>
          キャンセル
        </Button>
        <Button disabled={pending} onClick={request}>
          {masking?.hasMaskedVersion ? "作り直す" : "作る"}
        </Button>
      </DialogFooter>
    </>
  );
}

/**
 * 書類の公開用の版（個人情報を黒塗りし、メタデータを消した版）の状態と操作（#1802）。読み取り画面の一覧で使う。
 * 状態・黒塗りした箇所の数・失敗の理由を出し、版を開く（原本と見比べる）・作る・作り直すことができる。
 * 未作成の版はサーバー側で自動で作られるので（#1812）、未作成・作成中のあいだは作るボタンを出さない。
 */
export function DocumentMaskingStatus({
  target,
  documentId,
  masking,
  className,
}: {
  target: { politicianId: string; bookId: string };
  documentId: string;
  /** 読み込んだ時点の状態。読み込んだあとに登録された書類では無い（未作成として扱う） */
  masking: DocumentMasking | undefined;
  className?: string;
}) {
  const readOnly = useResearchFundReadOnly();
  const [requesting, setRequesting] = useState(false);
  const status = masking?.status ?? "pending";
  const requestable = canRerequestDocumentMasking(masking);

  return (
    <div className={cn("flex flex-col gap-1 text-xs", className)}>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-bold">公開用の版</span>
        <DocumentMaskingBadge status={status} />
        {status === "succeeded" && masking && masking.regionCount !== null && (
          <span className="text-muted-foreground">
            黒塗り <span className="font-latin">{masking.regionCount}</span> 箇所
          </span>
        )}
        {masking?.hasMaskedVersion && (
          <a
            href={researchFundDocumentUrl(target, documentId, "masked")}
            target="_blank"
            rel="noopener noreferrer"
            title="公開用の版を新しいタブで開きます（原本と見比べられます）"
            className="inline-flex items-center gap-0.5 underline underline-offset-2 hover:text-primary-active"
          >
            <ArrowSquareOut aria-hidden className="size-3.5" />
            開く
          </a>
        )}
        {requestable && (
          <Button
            type="button"
            variant="outline"
            size="xs"
            disabled={readOnly}
            title="公開用の版を作り直します。この書類への黒塗りの指示を添えられます"
            onClick={() => setRequesting(true)}
          >
            <ArrowClockwise aria-hidden />
            {masking?.hasMaskedVersion ? "作り直す" : "作る"}
          </Button>
        )}
      </div>
      {status === "failed" && (
        <p className="text-destructive">{masking?.error ?? "公開用の版の作成に失敗しました"}</p>
      )}
      {requestable && (
        <DocumentMaskingRequestDialog
          target={target}
          documentId={documentId}
          masking={masking}
          open={requesting}
          onOpenChange={setRequesting}
        />
      )}
    </div>
  );
}
