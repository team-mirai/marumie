import "server-only";

import { TransactionsClient } from "@/client/components/transactions/TransactionsClient";
import { TargetRequiredNotice } from "@/client/components/layout/TargetRequiredNotice";
import { loadCurrentOrganizationTarget } from "@/server/contexts/shared/presentation/loaders/load-current-organization-target";

export default async function TransactionsPage() {
  const target = await loadCurrentOrganizationTarget();

  if (!target) {
    return <TargetRequiredNotice label="Transactions" title="取引一覧" />;
  }

  return <TransactionsClient key={`${target.organizationId}:${target.year}`} target={target} />;
}
