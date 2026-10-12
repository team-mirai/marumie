import { PayeeCreateForm } from "@/client/components/research-fund/PayeeCreateForm";
import { loadPayeeCreateForm } from "@/server/contexts/research-fund/presentation/loaders/load-payees";

export default async function NewPayeePage({
  params,
}: {
  params: Promise<{ id: string; bookId: string }>;
}) {
  const { id, bookId } = await params;
  const data = await loadPayeeCreateForm(id, bookId);
  return <PayeeCreateForm key={bookId} {...data} />;
}
