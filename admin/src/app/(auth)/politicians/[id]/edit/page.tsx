import "server-only";
import { notFound } from "next/navigation";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { PoliticianForm } from "@/client/components/politicians/PoliticianForm";
import { loadPolitician } from "@/server/contexts/shared/presentation/loaders/load-politicians";
import { loadPoliticalOrganizationsData } from "@/server/contexts/shared/presentation/loaders/load-political-organizations-data";

export default async function EditPoliticianPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [politician, organizations] = await Promise.all([
    loadPolitician(id),
    loadPoliticalOrganizationsData(),
  ]);
  if (!politician) notFound();
  return (
    <div>
      <PageHeader label="Politicians" title={`${politician.name} を編集`} />
      <PoliticianForm
        politician={politician}
        organizations={organizations.map(({ id, displayName }) => ({ id, displayName }))}
      />
    </div>
  );
}
