import { PayeeList } from "@/client/components/research-fund/PayeeList";
import { loadPayees } from "@/server/contexts/research-fund/presentation/loaders/load-payees";

export default async function PayeesPage({
  params,
}: {
  params: Promise<{ id: string; bookId: string }>;
}) {
  const { id, bookId } = await params;
  const data = await loadPayees(id, bookId);
  return <PayeeList key={bookId} {...data} />;
}
