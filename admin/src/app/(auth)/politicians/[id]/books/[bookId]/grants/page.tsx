import { GrantRegistration } from "@/client/components/research-fund/GrantRegistration";
import { loadGrants } from "@/server/contexts/research-fund/presentation/loaders/load-grants";
import { requireRolePage } from "@/server/contexts/auth/presentation/loaders/require-role-page";
import { WriteFieldset } from "@/client/components/research-fund/ResearchFundWriteAccess";

export default async function GrantsPage({
  params,
}: {
  params: Promise<{ id: string; bookId: string }>;
}) {
  await requireRolePage("research_fund");
  const { id, bookId } = await params;
  const data = await loadGrants(id, bookId);
  return (
    <WriteFieldset>
      <GrantRegistration key={bookId} {...data} />
    </WriteFieldset>
  );
}
