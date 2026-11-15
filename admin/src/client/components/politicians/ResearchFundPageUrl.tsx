"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/client/components/ui";
import type { ResearchFundPageUrl as ResearchFundPageUrlValue } from "@/server/contexts/shared/domain/services/research-fund-page-url";

const LABELS = {
  public: "公開 URL",
  preview: "プレビュー URL",
} as const;

/**
 * 議員の調研費ページの URL を表示し、コピーできるようにする。
 * 非公開の議員にはプレビュー URL を出す（議員室に確認してもらうときに渡す）。
 */
export function ResearchFundPageUrl({ pageUrl }: { pageUrl: ResearchFundPageUrlValue }) {
  const [copied, setCopied] = useState(false);

  if (pageUrl.kind === "unavailable") {
    return (
      <p className="text-xs text-muted-foreground">
        RESEARCH_FUND_PREVIEW_SECRET が未設定のため、プレビュー URL を作れません
      </p>
    );
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("URL をコピーできませんでした");
    }
  };

  return (
    <div className="space-y-1">
      <p className="text-xs font-bold">{LABELS[pageUrl.kind]}</p>
      <div className="flex items-center gap-2">
        <a
          href={pageUrl.url}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 flex-1 truncate font-latin text-xs text-muted-foreground underline"
        >
          {pageUrl.url}
        </a>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 text-xs"
          onClick={handleCopy}
        >
          {copied ? <Check /> : <Copy />}
          {copied ? "コピーしました" : "コピー"}
        </Button>
      </div>
    </div>
  );
}
