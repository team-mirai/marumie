import "server-only";

import { requireRolePage } from "@/server/contexts/auth/presentation/loaders/require-role-page";
import { previewResearchFundSyncImport } from "@/server/contexts/research-fund/presentation/actions/preview-research-fund-sync-import";
import { runResearchFundSyncImport } from "@/server/contexts/research-fund/presentation/actions/run-research-fund-sync-import";
import { prepareSyncImportUpload } from "@/server/contexts/shared/presentation/actions/prepare-sync-import-upload";
import { isSyncImportAvailable } from "@/server/contexts/shared/presentation/loaders/read-sync-import-environment";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { ResearchFundSyncImportClient } from "@/client/components/sync-import/ResearchFundSyncImportClient";

// 複数の議員室の置き換えは既定の実行時間では終わらないので、関数の上限（300 秒）まで使う。
// 置き換えのトランザクション自体も同じ 300 秒で打ち切られ、取り消される。
export const maxDuration = 300;

const LABEL = "Research Fund Sync Import";
const TITLE = "調研費の同期用インポート";

export default async function ResearchFundSyncImportPage() {
  // サイドバーからは admin にしか見えないが、URL 直打ちでも実行させない。
  await requireRolePage("admin");

  // 本番に取り込むと取り返しがつかないので、環境ごと画面を出さない
  // （サーバー処理側でも政治団体の同期用インポートと同じ判定で拒否している）。
  if (!isSyncImportAvailable()) {
    return (
      <div>
        <PageHeader label={LABEL} title={TITLE} />
        <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          この環境では同期用データの取り込みは利用できません。
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        label={LABEL}
        title={TITLE}
        description="調研費の同期用エクスポートのJSONを取り込み、ファイルに入っている議員室の調研費データを丸ごと置き換えます"
      />

      <div className="mb-6 space-y-1 text-sm text-muted-foreground">
        <p>
          同じ slug
          の議員がこの環境にいなければ、ファイルのプロフィール（顔写真なし）で議員を作ります。所属履歴は、この環境に同じ
          slug の政治団体があるものだけ作ります。
        </p>
        <p>
          書類はファイルに含まれないため、取り込んだ仕訳は「書類なし」になります。置き換えで消える書類のストレージ上のファイルは削除しません。
        </p>
      </div>

      <ResearchFundSyncImportClient
        prepareUploadAction={prepareSyncImportUpload}
        previewAction={previewResearchFundSyncImport}
        importAction={runResearchFundSyncImport}
      />
    </div>
  );
}
