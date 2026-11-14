import "server-only";
import { notFound } from "next/navigation";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { PoliticianForm } from "@/client/components/politicians/PoliticianForm";
import { PhotoField } from "@/client/components/common/PhotoField";
import {
  loadPolitician,
  loadPoliticianPhotoUrl,
} from "@/server/contexts/shared/presentation/loaders/load-politicians";
import {
  deletePoliticianPhoto,
  uploadPoliticianPhoto,
} from "@/server/contexts/shared/presentation/actions/manage-politician";
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
      <PhotoField
        label="顔写真（任意・公開サイトに表示）"
        photoUrl={photoUrl}
        hasPhoto={politician.photoPath !== null}
        upload={uploadPoliticianPhoto.bind(null, politician.id)}
        remove={deletePoliticianPhoto.bind(null, politician.id)}
      />
      <PoliticianForm
        politician={politician}
        organizations={organizations.map(({ id, displayName }) => ({ id, displayName }))}
      />
    </div>
  );
}
