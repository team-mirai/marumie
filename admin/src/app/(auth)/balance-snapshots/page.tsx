import "server-only";

import { loadPoliticalOrganizationsData } from "@/server/contexts/shared/presentation/loaders/load-political-organizations-data";
import BalanceSnapshotsClient from "@/client/components/balance-snapshots/BalanceSnapshotsClient";

export default async function BalanceSnapshotsPage() {
  const organizations = await loadPoliticalOrganizationsData();

  return (
    <div className="bg-primary-panel rounded-xl p-4">
      <h1 className="text-2xl font-bold text-white mb-6">残高登録</h1>
      <BalanceSnapshotsClient organizations={organizations} />
    </div>
  );
}
