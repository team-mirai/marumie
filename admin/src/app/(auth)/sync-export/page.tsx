import "server-only";

import { UserRoleModel } from "@/server/contexts/auth/domain/models/user-role";
import { getCurrentUser } from "@/server/contexts/auth/presentation/loaders/load-current-user";
import { loadCurrentOrganizationTarget } from "@/server/contexts/shared/presentation/loaders/load-current-organization-target";
import { CurrentTargetBar } from "@/client/components/layout/CurrentTargetBar";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { TargetRequiredNotice } from "@/client/components/layout/TargetRequiredNotice";
import { SyncExportDownloadButton } from "@/client/components/sync-export/SyncExportDownloadButton";

const LABEL = "Sync Export";
const TITLE = "同期用エクスポート";

export default async function SyncExportPage() {
  const user = await getCurrentUser();

  // サイドバーからは admin にしか見えないが、URL 直打ちでも実行させない。
  if (!user || !UserRoleModel.isAdmin(user.role)) {
    return (
      <div>
        <PageHeader label={LABEL} title={TITLE} />
        <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          この画面は管理者（admin）のみ利用できます。
        </div>
      </div>
    );
  }

  const target = await loadCurrentOrganizationTarget();

  if (!target) {
    return <TargetRequiredNotice label={LABEL} title={TITLE} />;
  }

  return (
    <div>
      <PageHeader
        label={LABEL}
        title={TITLE}
        description="選択中の政治団体の政治資金データを、環境間で復元できるJSONファイルとして書き出します"
      />

      <CurrentTargetBar target={target} note="のデータを書き出します" />

      <div className="space-y-4 rounded-lg border border-border bg-card p-6">
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            取引（取引先・寄付者を含む）・残高・報告書プロフィールを、年度を問わず団体1件分まとめて書き出します。
          </p>
          <p>
            ファイルにはDBのIDを含めず、団体slug・取引番号・取引先名などの自然キーだけで表現するため、別環境のDBへそのまま取り込めます。
          </p>
        </div>

        <div className="flex justify-end">
          <SyncExportDownloadButton politicalOrganizationId={target.organizationId} />
        </div>
      </div>
    </div>
  );
}
