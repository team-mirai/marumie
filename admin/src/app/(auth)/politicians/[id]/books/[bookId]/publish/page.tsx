import { JournalPublication } from "@/client/components/research-fund/JournalPublication";
import { loadPublication } from "@/server/contexts/research-fund/presentation/loaders/load-publication";
import { requireRolePage } from "@/server/contexts/auth/presentation/loaders/require-role-page";

export default async function PublishPage({
  params,
}: {
  params: Promise<{ id: string; bookId: string }>;
}) {
  await requireRolePage("research_fund");
  const { id, bookId } = await params;
  const data = await loadPublication(id, bookId);
  return <JournalPublication key={bookId} {...data} />;
}
