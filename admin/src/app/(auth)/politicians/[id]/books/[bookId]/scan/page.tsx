import { DocumentScan } from "@/client/components/research-fund/DocumentScan";
import { loadScan } from "@/server/contexts/research-fund/presentation/loaders/load-scan";

export default async function ScanPage({
  params,
}: {
  params: Promise<{ id: string; bookId: string }>;
}) {
  const { id, bookId } = await params;
  const data = await loadScan(id, bookId);
  return <DocumentScan {...data} />;
}
