import "server-only";

import { loadPoliticalOrganizationsData } from "@/server/contexts/shared/presentation/loaders/load-political-organizations-data";
import BalanceSnapshotsClient from "@/client/components/balance-snapshots/BalanceSnapshotsClient";
import { PageHeader } from "@/client/components/layout/PageHeader";

export default async function BalanceSnapshotsPage() {
  const organizations = await loadPoliticalOrganizationsData();

  return (
    <div>
      <PageHeader label="Balance Snapshots" title="残高登録" />
      <BalanceSnapshotsClient organizations={organizations} />
    </div>
  );
}
