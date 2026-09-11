import { ExpenditureGroupForm } from "@/client/components/research-fund/ExpenditureGroupForm";
import { loadExpenditureGroupForm } from "@/server/contexts/research-fund/presentation/loaders/load-expenditure-groups";

export default async function EditExpenditureGroupPage({
  params,
}: {
  params: Promise<{ id: string; bookId: string; groupId: string }>;
}) {
  const { id, bookId, groupId } = await params;
  const data = await loadExpenditureGroupForm(id, bookId, groupId);
  return <ExpenditureGroupForm key={groupId} {...data} />;
}
