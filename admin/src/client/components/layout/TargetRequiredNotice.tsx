import { ChangeTargetButton } from "@/client/components/layout/TargetSelector";
import { PageHeader } from "@/client/components/layout/PageHeader";

interface TargetRequiredNoticeProps {
  /** PageHeader の英字ラベル */
  label: string;
  /** PageHeader の見出し */
  title: string;
}

/**
 * グローバル対象が政治団体でない（未選択、または議員室モード）ときに出す案内。
 * 勝手に別の団体へフォールバックせず、対象の選択を促す。
 */
export function TargetRequiredNotice({ label, title }: TargetRequiredNoticeProps) {
  return (
    <div>
      <PageHeader label={label} title={title} />
      <div className="space-y-3 rounded-lg border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          政治団体が選択されていません。サイドバー上部から対象の政治団体と年度を選んでください。
        </p>
        <ChangeTargetButton />
      </div>
    </div>
  );
}
