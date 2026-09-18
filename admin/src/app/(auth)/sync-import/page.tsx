import "server-only";

import { UserRoleModel } from "@/server/contexts/auth/domain/models/user-role";
import { getCurrentUser } from "@/server/contexts/auth/presentation/loaders/load-current-user";
import { previewSyncImport } from "@/server/contexts/data-import/presentation/actions/preview-sync-import";
import { runSyncImport } from "@/server/contexts/data-import/presentation/actions/run-sync-import";
import { isSyncImportAvailable } from "@/server/contexts/data-import/presentation/loaders/read-sync-import-environment";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { SyncImportClient } from "@/client/components/sync-import/SyncImportClient";

const LABEL = "Sync Import";
const TITLE = "同期用インポート";

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <PageHeader label={LABEL} title={TITLE} />
      <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
        {children}
      </div>
    </div>
  );
}

export default async function SyncImportPage() {
  const user = await getCurrentUser();

  // サイドバーからは admin にしか見えないが、URL 直打ちでも実行させない。
  if (!user || !UserRoleModel.isAdmin(user.role)) {
    return <Notice>この画面は管理者（admin）のみ利用できます。</Notice>;
  }

  // 本番に取り込むと取り返しがつかないので、環境ごと画面を出さない
  // （サーバー処理側でも同じ判定で拒否している）。
  if (!isSyncImportAvailable()) {
    return <Notice>この環境では同期用データの取り込みは利用できません。</Notice>;
  }

  return (
    <div>
      <PageHeader
        label={LABEL}
        title={TITLE}
        description="同期用エクスポートのJSONを取り込み、政治団体1件分の政治資金データを丸ごと置き換えます"
      />

      <SyncImportClient previewAction={previewSyncImport} importAction={runSyncImport} />
    </div>
  );
}
