import "server-only";

import { requireRolePage } from "@/server/contexts/auth/presentation/loaders/require-role-page";
import { loadPoliticians } from "@/server/contexts/shared/presentation/loaders/load-politicians";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { ResearchFundSyncExportForm } from "@/client/components/sync-export/ResearchFundSyncExportForm";

export default async function ResearchFundSyncExportPage() {
  // サイドバーからは admin にしか見えないが、URL 直打ちでも実行させない。
  await requireRolePage("admin");

  const politicians = await loadPoliticians();

  return (
    <div>
      <PageHeader
        label="Research Fund Sync Export"
        title="調研費の同期用エクスポート"
        description="選んだ議員室の調研費データを、環境間で復元できるJSONファイルとしてまとめて書き出します"
      />

      <div className="space-y-4 rounded-lg border border-border bg-card p-6">
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            議員のプロフィール（顔写真を除く）・政治団体の所属履歴・帳簿・支払先・仕訳・支出群・読み取りプロンプトを、年度を問わず議員室ごとに書き出します。
          </p>
          <p>
            領収書などの書類は含めず、仕訳は「書類なし」として書き出します。ファイルにはDBのIDやユーザーへの参照を含めず、議員slug・年度・仕訳のハッシュなどの自然キーだけで表現します。
          </p>
        </div>

        <ResearchFundSyncExportForm
          politicians={politicians.map(({ id, name, slug }) => ({ id, name, slug }))}
        />
      </div>
    </div>
  );
}
