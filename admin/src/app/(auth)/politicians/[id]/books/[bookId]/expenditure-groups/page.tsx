import { ExpenditureGroupList } from "@/client/components/research-fund/ExpenditureGroupList";
import { loadExpenditureGroups } from "@/server/contexts/research-fund/presentation/loaders/load-expenditure-groups";

export default async function ExpenditureGroupsPage({
  params,
}: {
  params: Promise<{ id: string; bookId: string }>;
}) {
  const { id, bookId } = await params;
  const data = await loadExpenditureGroups(id, bookId);
  return <ExpenditureGroupList key={`${bookId}:${data.policyComment}`} {...data} />;
}
