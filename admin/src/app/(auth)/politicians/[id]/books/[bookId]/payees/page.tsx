import { PayeeList } from "@/client/components/research-fund/PayeeList";
import { loadPayees } from "@/server/contexts/research-fund/presentation/loaders/load-payees";
import { requireRolePage } from "@/server/contexts/auth/presentation/loaders/require-role-page";

export default async function PayeesPage({
  params,
}: {
  params: Promise<{ id: string; bookId: string }>;
}) {
  await requireRolePage("research_fund");
  const { id, bookId } = await params;
  const data = await loadPayees(id, bookId);
  return <PayeeList key={bookId} {...data} />;
}
