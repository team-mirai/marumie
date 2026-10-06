import "server-only";

import { BulkDeleteTransactionsClient } from "@/client/components/transactions/BulkDeleteTransactionsClient";
import { TargetRequiredNotice } from "@/client/components/layout/TargetRequiredNotice";
import { loadCurrentOrganizationTarget } from "@/server/contexts/shared/presentation/loaders/load-current-organization-target";

export default async function BulkDeleteTransactionsPage() {
  const target = await loadCurrentOrganizationTarget();

  if (!target) {
    return <TargetRequiredNotice label="Bulk Delete" title="取引一括削除" />;
  }

  // 年度を切り替えたら前の年度の検索結果（＝削除対象）を持ち越さないよう作り直す
  return (
    <BulkDeleteTransactionsClient key={`${target.organizationId}-${target.year}`} target={target} />
  );
}
