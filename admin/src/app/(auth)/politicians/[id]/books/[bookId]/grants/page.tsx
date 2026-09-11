import { GrantRegistration } from "@/client/components/research-fund/GrantRegistration";
import { loadGrants } from "@/server/contexts/research-fund/presentation/loaders/load-grants";

export default async function GrantsPage({
  params,
}: {
  params: Promise<{ id: string; bookId: string }>;
}) {
  const { id, bookId } = await params;
  const data = await loadGrants(id, bookId);
  return <GrantRegistration key={bookId} {...data} />;
}
