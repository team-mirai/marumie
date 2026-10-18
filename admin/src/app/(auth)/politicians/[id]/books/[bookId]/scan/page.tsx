import { DocumentScan } from "@/client/components/research-fund/DocumentScan";
import { loadScan } from "@/server/contexts/research-fund/presentation/loaders/load-scan";
import { requireRolePage } from "@/server/contexts/auth/presentation/loaders/require-role-page";

export default async function ScanPage({
  params,
}: {
  params: Promise<{ id: string; bookId: string }>;
}) {
  await requireRolePage("research_fund");
  const { id, bookId } = await params;
  const data = await loadScan(id, bookId);
  return <DocumentScan {...data} />;
}
