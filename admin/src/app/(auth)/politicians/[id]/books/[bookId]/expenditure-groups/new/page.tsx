import { ExpenditureGroupForm } from "@/client/components/research-fund/ExpenditureGroupForm";
import { loadExpenditureGroupForm } from "@/server/contexts/research-fund/presentation/loaders/load-expenditure-groups";

export default async function NewExpenditureGroupPage({
  params,
}: {
  params: Promise<{ id: string; bookId: string }>;
}) {
  const { id, bookId } = await params;
  const data = await loadExpenditureGroupForm(id, bookId, null);
  return <ExpenditureGroupForm {...data} />;
}
