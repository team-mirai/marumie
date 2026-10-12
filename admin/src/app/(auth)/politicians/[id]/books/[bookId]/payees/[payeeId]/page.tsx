import { PayeeDetail } from "@/client/components/research-fund/PayeeDetail";
import { loadPayeeDetail } from "@/server/contexts/research-fund/presentation/loaders/load-payee-detail";

export default async function PayeeDetailPage({
  params,
}: {
  params: Promise<{ id: string; bookId: string; payeeId: string }>;
}) {
  const { id, bookId, payeeId } = await params;
  const data = await loadPayeeDetail(id, bookId, payeeId);
  return <PayeeDetail key={`${bookId}:${payeeId}`} {...data} />;
}
