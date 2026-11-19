import { PayeeDetail } from "@/client/components/research-fund/PayeeDetail";
import { loadPayeeDetail } from "@/server/contexts/research-fund/presentation/loaders/load-payee-detail";
import { requireRolePage } from "@/server/contexts/auth/presentation/loaders/require-role-page";

export default async function PayeeDetailPage({
  params,
}: {
  params: Promise<{ id: string; bookId: string; payeeId: string }>;
}) {
  await requireRolePage("research_fund");
  const { id, bookId, payeeId } = await params;
  const data = await loadPayeeDetail(id, bookId, payeeId);
  return <PayeeDetail key={`${bookId}:${payeeId}`} {...data} />;
}
