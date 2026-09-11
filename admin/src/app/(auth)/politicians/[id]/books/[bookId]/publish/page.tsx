import { JournalPublication } from "@/client/components/research-fund/JournalPublication";
import { loadPublication } from "@/server/contexts/research-fund/presentation/loaders/load-publication";

export default async function PublishPage({
  params,
}: {
  params: Promise<{ id: string; bookId: string }>;
}) {
  const { id, bookId } = await params;
  const data = await loadPublication(id, bookId);
  return <JournalPublication key={bookId} {...data} />;
}
