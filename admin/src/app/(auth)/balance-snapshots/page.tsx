import "server-only";

import { loadCurrentOrganizationTarget } from "@/server/contexts/shared/presentation/loaders/load-current-organization-target";
import BalanceSnapshotsClient from "@/client/components/balance-snapshots/BalanceSnapshotsClient";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { CurrentTargetBar } from "@/client/components/layout/CurrentTargetBar";
import { TargetRequiredNotice } from "@/client/components/layout/TargetRequiredNotice";
import { requireRolePage } from "@/server/contexts/auth/presentation/loaders/require-role-page";

export default async function BalanceSnapshotsPage() {
  await requireRolePage("political_fund");
  const target = await loadCurrentOrganizationTarget();

  if (!target) {
    return <TargetRequiredNotice label="Balance Snapshots" title="残高登録" />;
  }

  return (
    <div>
      <PageHeader label="Balance Snapshots" title="残高登録" />
      <CurrentTargetBar target={target} note="の残高を登録します" />
      <BalanceSnapshotsClient
        key={target.organizationId}
        politicalOrganizationId={target.organizationId}
      />
    </div>
  );
}
