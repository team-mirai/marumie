import "server-only";
import { notFound } from "next/navigation";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { PoliticianForm } from "@/client/components/politicians/PoliticianForm";
import { PoliticianPhotoField } from "@/client/components/politicians/PoliticianPhotoField";
import {
  loadPolitician,
  loadPoliticianPhotoUrl,
} from "@/server/contexts/shared/presentation/loaders/load-politicians";
import { loadPoliticalOrganizationsData } from "@/server/contexts/shared/presentation/loaders/load-political-organizations-data";
import { requireRolePage } from "@/server/contexts/auth/presentation/loaders/require-role-page";

export default async function EditPoliticianPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRolePage("admin");
  const { id } = await params;
  const [politician, organizations] = await Promise.all([
    loadPolitician(id),
    loadPoliticalOrganizationsData(),
  ]);
  if (!politician) notFound();
  const photoUrl = await loadPoliticianPhotoUrl(politician.photoPath);
  return (
    <div>
      <PageHeader label="Politicians" title={`${politician.name} を編集`} />
      <PoliticianPhotoField
        politicianId={politician.id}
        photoUrl={photoUrl}
        hasPhoto={politician.photoPath !== null}
      />
      <PoliticianForm
        politician={politician}
        organizations={organizations.map(({ id, displayName }) => ({ id, displayName }))}
      />
    </div>
  );
}
