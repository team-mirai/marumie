import { ChangeTargetButton } from "@/client/components/layout/TargetSelector";
import type { OrganizationTarget } from "@/server/contexts/shared/domain/models/admin-target";

interface CurrentTargetBarProps {
  target: OrganizationTarget;
  /** 対象名の後ろに添える補足（例: 「に取り込まれます」） */
  note?: string;
}

/**
 * 政治団体系ページの本文上部に置く「いまどの政治団体・年度を操作しているか」の表示。
 * ページ内セレクタを廃止した代わりに、対象の明示と切り替え導線をここで担う。
 */
export function CurrentTargetBar({ target, note }: CurrentTargetBarProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-ring bg-accent px-4 py-2.5 text-[13px] text-accent-foreground">
      <span className="font-bold">
        {target.name}／<span className="font-latin">{target.year}</span>年度
      </span>
      {note && <span className="text-muted-foreground">{note}</span>}
      <ChangeTargetButton />
    </div>
  );
}
