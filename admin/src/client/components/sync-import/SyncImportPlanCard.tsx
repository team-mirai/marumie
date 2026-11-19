import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import type { OrganizationSyncImportPlan } from "@/server/contexts/data-import/domain/models/organization-sync-import";

/** 「いま何件 → 何件になるか」を 1 行で見せる。 */
function ChangeRow({ label, from, to }: { label: string; from: number; to: number }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border-soft py-2 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-latin flex items-center gap-2 text-sm text-foreground">
        <span className="text-destructive">{from.toLocaleString()}</span>
        <ArrowRight aria-hidden className="size-3.5 text-subtle-foreground" />
        <span className="font-bold">{to.toLocaleString()}</span>
      </span>
    </div>
  );
}

function CountRow({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border-soft py-2 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-latin text-sm font-bold text-foreground">{count.toLocaleString()}</span>
    </div>
  );
}

/** 実行前の確認（dry-run）。何が消えて、何が入り、何が新しく作られるかを出す。 */
export function SyncImportPlanCard({ plan }: { plan: OrganizationSyncImportPlan }) {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-6">
      <div>
        <h2 className="text-base font-bold text-foreground">実行するとこうなります</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          取り込み先: <span className="font-bold">{plan.organizationDisplayName}</span>
          <span className="font-latin ml-2 text-xs">({plan.organizationSlug})</span>
        </p>
      </div>

      <div>
        <ChangeRow
          label="取引"
          from={plan.deletingTransactionCount}
          to={plan.importingTransactionCount}
        />
        <ChangeRow
          label="残高"
          from={plan.deletingBalanceSnapshotCount}
          to={plan.importingBalanceSnapshotCount}
        />
        <CountRow label="新規作成される取引先" count={plan.newCounterpartCount} />
        <CountRow label="新規作成される寄付者" count={plan.newDonorCount} />
        <CountRow label="上書きされる報告書プロフィール" count={plan.upsertingReportProfileCount} />
      </div>

      <dl className="font-latin grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-2 rounded-md bg-background p-3 text-xs text-muted-foreground">
        <div>
          <dt className="font-sans">書き出し元</dt>
          <dd className="text-foreground">{plan.sourceEnvironment}</dd>
        </div>
        <div>
          <dt className="font-sans">書き出し日時</dt>
          <dd className="text-foreground">{plan.exportedAt}</dd>
        </div>
        <div>
          <dt className="font-sans">書き出し元のマイグレーション</dt>
          <dd className="text-foreground">{plan.latestMigrationName ?? "不明"}</dd>
        </div>
      </dl>
    </div>
  );
}
