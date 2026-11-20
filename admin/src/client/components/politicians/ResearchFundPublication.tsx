import { cn } from "@/client/lib";
import { ResearchFundComingSoonForm } from "@/client/components/politicians/ResearchFundComingSoonForm";
import { ResearchFundPageUrl } from "@/client/components/politicians/ResearchFundPageUrl";
import { ResearchFundPublicSwitch } from "@/client/components/politicians/ResearchFundPublicSwitch";
import type { ResearchFundPageUrl as ResearchFundPageUrlValue } from "@/server/contexts/shared/domain/services/research-fund-page-url";

/**
 * 議員カードの「調研費の公開」のまとまり。公開状態をバッジで示し、ページの URL とコピー操作をまとめる。
 * 公開の切り替えは admin だけ（canManage）。それ以外には状態のバッジだけを出す（#1894, #1899）。
 */
export function ResearchFundPublication({
  id,
  isResearchFundPublic,
  researchFundComingSoonNote,
  pageUrl,
  canManage,
}: {
  id: string;
  isResearchFundPublic: boolean;
  researchFundComingSoonNote: string | null;
  pageUrl: ResearchFundPageUrlValue;
  canManage: boolean;
}) {
  return (
    <section className="space-y-3 border-t border-border-soft pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold">調研費の公開</h3>
          <span
            className={cn(
              "inline-block rounded-full border-[1.5px] px-3 py-[3px] text-[11px] font-bold leading-none whitespace-nowrap",
              isResearchFundPublic
                ? "border-primary-active bg-accent text-primary-active"
                : "border-subtle-foreground bg-secondary text-muted-foreground",
            )}
          >
            {isResearchFundPublic ? "公開中" : "非公開"}
          </span>
          {!isResearchFundPublic && researchFundComingSoonNote !== null && (
            <span className="inline-block rounded-full border-[1.5px] border-subtle-foreground bg-secondary px-3 py-[3px] text-[11px] font-bold leading-none whitespace-nowrap text-muted-foreground">
              準備中として表示
            </span>
          )}
        </div>
        {canManage && (
          <ResearchFundPublicSwitch id={id} isResearchFundPublic={isResearchFundPublic} />
        )}
      </div>
      {!isResearchFundPublic && (
        <p className="text-xs text-muted-foreground">
          プレビュー URL を知っている人だけが見られます
        </p>
      )}
      {!isResearchFundPublic && canManage && (
        <ResearchFundComingSoonForm id={id} comingSoonNote={researchFundComingSoonNote} />
      )}
      <ResearchFundPageUrl pageUrl={pageUrl} />
    </section>
  );
}
