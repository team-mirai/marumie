"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowClockwise, ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { Button } from "@/client/components/ui";
import { useResearchFundReadOnly } from "@/client/components/research-fund/ResearchFundWriteAccess";
import { cn, researchFundDocumentUrl } from "@/client/lib";
import {
  type DocumentMasking,
  DocumentMaskingPolicy,
  type DocumentMaskingStatus as MaskingStatus,
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
export function DocumentMaskingBadge({ status }: { status: MaskingStatus }) {
  return (
    <span
      className={cn(
        "inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
        STATUS_STYLES[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

/**
 * 公開用の版を作り直せるか。未作成は自動で作られるので、作り直しの依頼は作成済み・失敗の書類だけで受ける
 */
export function canRerequestDocumentMasking(masking: DocumentMasking | undefined): boolean {
  const status = masking?.status ?? "pending";
  return status !== "pending" && DocumentMaskingPolicy.canRequest(status);
}

/** 公開用の版の作り直しを依頼する。読み取り画面の一覧と仕訳の詳細カードで共有する */
export function useRequestDocumentMasking(
  target: { politicianId: string; bookId: string },
  documentId: string,
) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function request() {
    startTransition(async () => {
      try {
        const result = await requestDocumentMasking(target.politicianId, target.bookId, documentId);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success("公開用の版を作り直します");
        router.refresh();
      } catch {
        toast.error("通信に失敗しました。再度お試しください");
      }
    });
  }
  return { pending, request };
}

/**
 * 書類の公開用の版（個人情報を黒塗りし、メタデータを消した版）の状態と操作（#1802）。読み取り画面の一覧で使う。
 * 状態・黒塗りした箇所の数・失敗の理由を出し、版を開く（原本と見比べる）・作る・作り直すことができる。
 * 未作成の版は帳簿の画面を開いている間に自動で作られるので、未作成・作成中のあいだは作るボタンを出さない。
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
  const { pending, request } = useRequestDocumentMasking(target, documentId);
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
            disabled={pending || readOnly}
            title="公開用の版を作り直します。できあがると前の版は置き換わります"
            onClick={request}
          >
            <ArrowClockwise aria-hidden />
            {masking?.hasMaskedVersion ? "作り直す" : "作る"}
          </Button>
        )}
      </div>
      {status === "failed" && (
        <p className="text-destructive">{masking?.error ?? "公開用の版の作成に失敗しました"}</p>
      )}
    </div>
  );
}
