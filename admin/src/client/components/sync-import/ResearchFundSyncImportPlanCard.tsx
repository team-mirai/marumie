import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import type {
  ResearchFundSyncImportPlan,
  ResearchFundSyncImportPlanPolitician,
} from "@/server/contexts/research-fund/domain/models/research-fund-sync-import";

/** 件数を出す項目（ファイル側と、置き換えで消える側で共通）。 */
const COUNT_ROWS = [
  { key: "books", label: "帳簿" },
  { key: "journalEntries", label: "仕訳" },
  { key: "payees", label: "支払先" },
  { key: "expenditureGroups", label: "支出群" },
  { key: "prompts", label: "読み取りプロンプト" },
  { key: "addressSearchPrompts", label: "住所検索プロンプト" },
] as const;

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

function PoliticianPlan({ politician }: { politician: ResearchFundSyncImportPlanPolitician }) {
  const isReplace = politician.mode === "replace";

  return (
    <section
      aria-label={`${politician.name}（${politician.slug}）`}
      className="rounded-md border border-border p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-foreground">
          <span className="font-bold">{politician.name}</span>
          <span className="font-latin ml-2 text-xs text-muted-foreground">({politician.slug})</span>
        </p>
        <span
          className={
            isReplace
              ? "rounded-full bg-destructive-hover px-2.5 py-0.5 text-xs font-bold text-destructive"
              : "rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-primary-active"
          }
        >
          {isReplace ? "既存の議員室を置き換える" : "議員を新しく作る"}
        </span>
      </div>

      <div className="mt-3">
        {politician.mode === "replace" ? (
          <>
            {COUNT_ROWS.map(({ key, label }) => (
              <ChangeRow
                key={key}
                label={label}
                from={politician.deleting[key]}
                to={politician.importing[key]}
              />
            ))}
            <ChangeRow
              label="書類（ファイルには含まれません）"
              from={politician.deleting.documents}
              to={0}
            />
            <ChangeRow label="スキャン履歴" from={politician.deleting.scanJobs} to={0} />
          </>
        ) : (
          <>
            {COUNT_ROWS.map(({ key, label }) => (
              <CountRow key={key} label={label} count={politician.importing[key]} />
            ))}
            <CountRow label="作られる所属履歴" count={politician.creatingMembershipCount} />
          </>
        )}
      </div>

      {politician.mode === "replace" ? (
        <p className="mt-2 text-xs text-muted-foreground">
          議員のプロフィール・所属履歴・担当ユーザーは変更しません。
        </p>
      ) : (
        politician.skippedOrganizationSlugs.length > 0 && (
          <p className="mt-2 text-xs text-destructive">
            この環境に無い政治団体の所属履歴は作られません:{" "}
            <span className="font-latin">{politician.skippedOrganizationSlugs.join(", ")}</span>
          </p>
        )
      )}
    </section>
  );
}

/** 実行前の確認（dry-run）。議員室ごとに、何が消えて何が入るかを出す。 */
export function ResearchFundSyncImportPlanCard({ plan }: { plan: ResearchFundSyncImportPlan }) {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-6">
      <div>
        <h2 className="text-base font-bold text-foreground">実行するとこうなります</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          ファイルに入っている {plan.politicians.length.toLocaleString()} 件の議員室が対象です（左:
          この環境の今の件数 → 右: 取り込み後の件数）
        </p>
      </div>

      <div className="space-y-3">
        {plan.politicians.map((politician) => (
          <PoliticianPlan key={politician.slug} politician={politician} />
        ))}
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
