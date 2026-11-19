import { ExpenditureGroupList } from "@/client/components/research-fund/ExpenditureGroupList";
import { loadExpenditureGroups } from "@/server/contexts/research-fund/presentation/loaders/load-expenditure-groups";
import { requireRolePage } from "@/server/contexts/auth/presentation/loaders/require-role-page";

export default async function ExpenditureGroupsPage({
  params,
}: {
  params: Promise<{ id: string; bookId: string }>;
}) {
  await requireRolePage("research_fund");
  const { id, bookId } = await params;
  const data = await loadExpenditureGroups(id, bookId);
  return <ExpenditureGroupList key={`${bookId}:${data.policyComment}`} {...data} />;
}
