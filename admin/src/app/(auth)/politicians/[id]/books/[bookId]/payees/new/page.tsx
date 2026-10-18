import { PayeeCreateForm } from "@/client/components/research-fund/PayeeCreateForm";
import { loadPayeeCreateForm } from "@/server/contexts/research-fund/presentation/loaders/load-payees";
import { requireRolePage } from "@/server/contexts/auth/presentation/loaders/require-role-page";

export default async function NewPayeePage({
  params,
}: {
  params: Promise<{ id: string; bookId: string }>;
}) {
  await requireRolePage("research_fund");
  const { id, bookId } = await params;
  const data = await loadPayeeCreateForm(id, bookId);
  return <PayeeCreateForm key={bookId} {...data} />;
}
