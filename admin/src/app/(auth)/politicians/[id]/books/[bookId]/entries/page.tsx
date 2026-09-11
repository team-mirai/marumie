import { loadJournalReview } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import { JournalReview } from "@/client/components/research-fund/JournalReview";
export default async function JournalReviewPage({
  params,
}: {
  params: Promise<{ id: string; bookId: string }>;
}) {
  const { id, bookId } = await params;
  const data = await loadJournalReview(id, bookId);
  return <JournalReview key={bookId} {...data} />;
}
