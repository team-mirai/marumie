"use client";
import { useRef, useState, type ReactNode, type RefObject } from "react";
import {
  ArrowClockwise,
  ArrowSquareOut,
  ArrowsLeftRight,
  ArrowsOut,
  Paperclip,
} from "@phosphor-icons/react/dist/ssr";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/client/components/ui";
import {
  canRerequestDocumentMasking,
  DocumentMaskingBadge,
  useRequestDocumentMasking,
} from "@/client/components/research-fund/DocumentMaskingStatus";
import { useResearchFundReadOnly } from "@/client/components/research-fund/ResearchFundWriteAccess";
import { cn, researchFundDocumentUrl } from "@/client/lib";
import type { DocumentMasking } from "@/server/contexts/research-fund/domain/models/document-masking";
import { DOCUMENT_UPLOAD_MAX_SIZE_LABEL } from "@/server/contexts/research-fund/domain/models/document-upload";
import { SCAN_DOCUMENT_MIME_TYPES } from "@/server/contexts/research-fund/domain/models/scan-batch";

type DocumentVersion = "original" | "masked";
/** 大きく表示したときの見せ方。どちらか一方、または左右に並べる */
type ViewerMode = DocumentVersion | "side";

const VERSION_LABELS: Record<DocumentVersion, string> = {
  original: "原本",
  masked: "公開用の版",
};

const newTabLinkClassName =
  "inline-flex items-center gap-0.5 rounded-sm text-[11px] font-bold whitespace-nowrap text-primary-active underline-offset-2 transition-colors duration-150 ease-out outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

/** 作り直し・差し替えなど、見比べるより控えめにする文字のボタン */
const subtleButtonClassName =
  "inline-flex cursor-pointer items-center gap-0.5 rounded-sm text-[11px] whitespace-nowrap text-muted-foreground underline underline-offset-2 transition-colors duration-150 ease-out outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:text-disabled-foreground";

/**
 * 詳細カードの書類まわり。書類の無い仕訳と支給は、その旨だけを出す。
 * 書類の無い仕訳に領収書を紐づけられるとき（onAttach を渡したとき）は、ファイルを選ぶボタンも出す。
 * 書類を差し替えられるとき（onReplace を渡したとき）は、原本の行に差し替えるボタンを出す。
 */
export function JournalDocumentPreview({
  grant,
  target,
  documentId,
  masking,
  pending = false,
  onAttach,
  onReplace,
}: {
  grant: boolean;
  target: { politicianId: string; bookId: string };
  documentId: string | null;
  /** 紐づく書類の公開用の版の状態。読み込んだあとに紐づけた書類では無い（未作成として扱う） */
  masking?: DocumentMasking;
  pending?: boolean;
  /** 書類の無い仕訳に領収書ファイルを紐づける。紐づけられない仕訳では渡さない */
  onAttach?: (file: File) => void;
  /** 書類のある仕訳の書類ファイルを差し替える。差し替えられない仕訳では渡さない */
  onReplace?: (file: File) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  if (!grant && documentId !== null)
    return (
      <JournalDocumentPanel
        target={target}
        documentId={documentId}
        masking={masking}
        pending={pending}
        onReplace={onReplace}
      />
    );
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
            title={`あとから届いた領収書（JPG・PNG・PDF・1ファイル${DOCUMENT_UPLOAD_MAX_SIZE_LABEL}まで）をこの仕訳に紐づけます`}
            onClick={() => fileInput.current?.click()}
          >
            <Paperclip aria-hidden />
            領収書を紐づける
          </Button>
          <DocumentFileInput
            inputRef={fileInput}
            label="紐づける領収書ファイル"
            onSelect={onAttach}
          />
        </>
      )}
    </div>
  );
}

/** 書類ファイルを 1 つ選ぶ、見えない入力欄。ボタンから click() で開く */
function DocumentFileInput({
  inputRef,
  label,
  onSelect,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  label: string;
  onSelect: (file: File) => void;
}) {
  return (
    <input
      ref={inputRef}
      type="file"
      accept={SCAN_DOCUMENT_MIME_TYPES.join(",")}
      aria-label={label}
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];
        // 同じファイルを選び直しても onChange が起きるように、選択を毎回空に戻す
        e.target.value = "";
        if (file) onSelect(file);
      }}
    />
  );
}

/** 公開用の版が見られないとき（まだ無いとき）の理由。見られるときは null */
function maskedUnavailableReason(masking: DocumentMasking | undefined): string | null {
  if (masking?.hasMaskedVersion) return null;
  switch (masking?.status ?? "pending") {
    case "running":
      return "公開用の版を作成中です。できあがると見られます";
    case "failed":
      return "公開用の版の作成に失敗したため、見られる版がありません";
    default:
      return "公開用の版はまだ作られていません。自動で作られるので、しばらくしてから再読み込みしてください";
  }
}

/**
 * 書類のある仕訳の書類まわり（#1810）。原本の小さなプレビューの下に、原本と公開用の版を同じ形の行で並べ、
 * どちらも「拡大」で大きく表示（表示したまま切り替え・左右に並べて見比べられる）、「新しいタブ」で開ける。
 * 公開用の版の行には状態・黒塗りした箇所の数を添え、見られないときはその理由、失敗したときは失敗の理由を出す。
 * 作り直しは見比べるより控えめな文字のボタンにし、前の版が置き換わることを横に書いておく。
 * 書類の差し替え（#1827）も同じく控えめな文字のボタンにし、原本の行の下に出す。
 */
function JournalDocumentPanel({
  target,
  documentId,
  masking,
  pending: busy,
  onReplace,
}: {
  target: { politicianId: string; bookId: string };
  documentId: string;
  masking: DocumentMasking | undefined;
  pending: boolean;
  onReplace?: (file: File) => void;
}) {
  const readOnly = useResearchFundReadOnly();
  const replaceInput = useRef<HTMLInputElement>(null);
  const { pending, request } = useRequestDocumentMasking(target, documentId);
  const [viewer, setViewer] = useState<ViewerMode | null>(null);
  const status = masking?.status ?? "pending";
  const unavailable = maskedUnavailableReason(masking);
  const urls: Record<DocumentVersion, string> = {
    original: researchFundDocumentUrl(target, documentId),
    masked: researchFundDocumentUrl(target, documentId, "masked"),
  };
  // 作り直した版ができあがったら（状態・黒塗りの数が変わったら）、表示中の公開用の版を読み込み直す
  const maskedKey = `${urls.masked}:${status}:${masking?.regionCount ?? ""}`;
  const remaking = masking?.hasMaskedVersion && (status === "pending" || status === "running");

  function versionActions(version: DocumentVersion) {
    const disabled = version === "masked" && unavailable !== null;
    return (
      <>
        <Button
          type="button"
          variant="outline"
          size="xs"
          disabled={disabled}
          aria-label={`${VERSION_LABELS[version]}を拡大して表示`}
          onClick={() => setViewer(version)}
        >
          <ArrowsOut aria-hidden />
          拡大
        </Button>
        {disabled ? (
          <span className={cn(newTabLinkClassName, "cursor-not-allowed text-disabled-foreground")}>
            <ArrowSquareOut aria-hidden className="size-3.5" />
            新しいタブ
          </span>
        ) : (
          <a
            href={urls[version]}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${VERSION_LABELS[version]}を新しいタブで開く`}
            className={newTabLinkClassName}
          >
            <ArrowSquareOut aria-hidden className="size-3.5" />
            新しいタブ
          </a>
        )}
      </>
    );
  }

  return (
    <section
      aria-label="書類"
      className="shrink-0 overflow-hidden rounded-md border border-disabled-border text-xs"
    >
      <div className="h-[168px] bg-muted-foreground">
        <iframe
          key={urls.original}
          title="領収書プレビュー（原本）"
          src={urls.original}
          className="size-full"
        />
      </div>
      <div className="divide-y divide-border-soft border-t border-disabled-border px-2.5">
        <DocumentVersionRow
          label="原本"
          actions={versionActions("original")}
          below={
            onReplace && (
              <p className="flex flex-wrap items-center gap-x-1.5 text-muted-foreground">
                <button
                  type="button"
                  disabled={busy || readOnly}
                  title={`別の書類ファイル（JPG・PNG・PDF・1ファイル${DOCUMENT_UPLOAD_MAX_SIZE_LABEL}まで）に差し替えます`}
                  onClick={() => replaceInput.current?.click()}
                  className={subtleButtonClassName}
                >
                  <ArrowsLeftRight aria-hidden className="size-3" />
                  書類を差し替える
                </button>
                <span className="text-[11px]">
                  （仕訳の内容と領収書等番号はそのまま。公開用の版は作り直します）
                </span>
                <DocumentFileInput
                  inputRef={replaceInput}
                  label="差し替える書類ファイル"
                  onSelect={onReplace}
                />
              </p>
            )
          }
        />
        <DocumentVersionRow
          label="公開用の版"
          status={
            <>
              <DocumentMaskingBadge status={status} />
              {status === "succeeded" && masking && masking.regionCount !== null && (
                <span className="text-muted-foreground">
                  黒塗り <span className="font-latin">{masking.regionCount}</span> 箇所
                </span>
              )}
            </>
          }
          actions={versionActions("masked")}
          below={
            <>
              {status === "failed" && (
                <p className="text-destructive">
                  {masking?.error ?? "公開用の版の作成に失敗しました"}
                </p>
              )}
              {unavailable !== null ? (
                <p className="text-muted-foreground">{unavailable}</p>
              ) : (
                remaking && (
                  <p className="text-muted-foreground">
                    作り直しています。できあがるまでは前の版を表示します
                  </p>
                )
              )}
              {canRerequestDocumentMasking(masking) && (
                <p className="flex flex-wrap items-center gap-x-1.5 text-muted-foreground">
                  <button
                    type="button"
                    disabled={pending || readOnly}
                    onClick={request}
                    className={subtleButtonClassName}
                  >
                    <ArrowClockwise aria-hidden className="size-3" />
                    {masking?.hasMaskedVersion ? "作り直す" : "作る"}
                  </button>
                  {masking?.hasMaskedVersion && (
                    <span className="text-[11px]">
                      （できあがると今の公開用の版は置き換わります）
                    </span>
                  )}
                </p>
              )}
            </>
          }
        />
      </div>
      <DocumentCompareDialog
        mode={viewer}
        onModeChange={setViewer}
        originalUrl={urls.original}
        maskedUrl={urls.masked}
        maskedKey={maskedKey}
        maskedUnavailable={unavailable}
      />
    </section>
  );
}

/** 書類まわりの 1 行（版の名前・状態 ＋ 右端の拡大・新しいタブ）。下に補足を出せる */
function DocumentVersionRow({
  label,
  status,
  actions,
  below,
}: {
  label: string;
  status?: ReactNode;
  actions: ReactNode;
  below?: ReactNode;
}) {
  return (
    <div className="space-y-1 py-1.5">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <span className="font-bold">{label}</span>
          {status}
        </div>
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      </div>
      {below}
    </div>
  );
}

/**
 * 書類を大きく表示するダイアログ。原本・公開用の版・左右に並べるをタブで切り替える（Esc で閉じる）。
 * 切り替えても読み込み直さないよう、両方の版をずっと出しておき、見せ方だけを変える。
 * それぞれの版の上には版の名前と新しいタブで開くリンクを出し、いま見ているのがどちらかを常に示す。
 */
function DocumentCompareDialog({
  mode,
  onModeChange,
  originalUrl,
  maskedUrl,
  maskedKey,
  maskedUnavailable,
}: {
  /** 表示中の見せ方。閉じているときは null */
  mode: ViewerMode | null;
  onModeChange: (mode: ViewerMode | null) => void;
  originalUrl: string;
  maskedUrl: string;
  maskedKey: string;
  maskedUnavailable: string | null;
}) {
  return (
    <Dialog open={mode !== null} onOpenChange={(open) => !open && onModeChange(null)}>
      <DialogContent
        aria-describedby={undefined}
        className="flex h-[90vh] w-[min(1440px,95vw)] max-w-none flex-col gap-3 p-4 sm:max-w-none"
      >
        <div className="flex flex-wrap items-center gap-3 pr-8">
          <DialogTitle className="text-sm font-bold">書類を見比べる</DialogTitle>
          <Tabs value={mode ?? "original"} onValueChange={(v) => onModeChange(v as ViewerMode)}>
            <TabsList>
              <TabsTrigger value="original" className="text-xs">
                原本
              </TabsTrigger>
              <TabsTrigger value="masked" className="text-xs">
                公開用の版
              </TabsTrigger>
              <TabsTrigger value="side" className="text-xs">
                並べて表示
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div
          className={cn(
            "grid min-h-0 flex-1 gap-3",
            mode === "side" ? "grid-cols-2" : "grid-cols-1",
          )}
        >
          <DocumentPane
            label="原本"
            url={originalUrl}
            hidden={mode === "masked"}
            unavailable={null}
          />
          <DocumentPane
            key={maskedKey}
            label="公開用の版"
            url={maskedUrl}
            hidden={mode === "original"}
            unavailable={maskedUnavailable}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DocumentPane({
  label,
  url,
  hidden,
  unavailable,
}: {
  label: string;
  url: string;
  hidden: boolean;
  /** 見られないときの理由。見られるときは null */
  unavailable: string | null;
}) {
  return (
    <section
      aria-label={label}
      hidden={hidden}
      className={cn("flex min-h-0 flex-col gap-1.5", hidden && "hidden")}
    >
      <div className="flex items-center gap-2 text-xs">
        <span className="rounded-full border border-primary-active bg-accent px-2.5 py-0.5 font-bold text-accent-foreground">
          {label}
        </span>
        {unavailable === null && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${label}を新しいタブで開く`}
            className={newTabLinkClassName}
          >
            <ArrowSquareOut aria-hidden className="size-3.5" />
            新しいタブ
          </a>
        )}
      </div>
      {unavailable === null ? (
        <iframe
          title={`領収書（${label}）`}
          src={url}
          className="min-h-0 w-full flex-1 rounded-md border border-border-soft"
        />
      ) : (
        <p className="flex flex-1 items-center justify-center rounded-md border border-dashed px-4 text-center text-sm text-muted-foreground">
          {unavailable}
        </p>
      )}
    </section>
  );
}
