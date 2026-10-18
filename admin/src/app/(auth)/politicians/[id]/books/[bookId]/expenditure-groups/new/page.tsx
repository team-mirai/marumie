import { ExpenditureGroupForm } from "@/client/components/research-fund/ExpenditureGroupForm";
import { loadExpenditureGroupForm } from "@/server/contexts/research-fund/presentation/loaders/load-expenditure-groups";
import { requireRolePage } from "@/server/contexts/auth/presentation/loaders/require-role-page";
import { WriteFieldset } from "@/client/components/research-fund/ResearchFundWriteAccess";

export default async function NewExpenditureGroupPage({
  params,
}: {
  params: Promise<{ id: string; bookId: string }>;
}) {
  await requireRolePage("research_fund");
  const { id, bookId } = await params;
  const data = await loadExpenditureGroupForm(id, bookId, null);
  return (
    <WriteFieldset>
      <ExpenditureGroupForm {...data} />
    </WriteFieldset>
  );
}
