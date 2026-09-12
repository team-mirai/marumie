import { loadJournalReview } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import { JournalReview } from "@/client/components/research-fund/JournalReview";
export default async function JournalReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; bookId: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { id, bookId } = await params;
  const { status } = await searchParams;
  const data = await loadJournalReview(id, bookId);
  return <JournalReview key={bookId} initialStatus={status} {...data} />;
}
