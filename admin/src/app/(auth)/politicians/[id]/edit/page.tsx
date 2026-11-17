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
import { UserRoleModel } from "@/server/contexts/auth/domain/models/user-role";
import { requireRolePage } from "@/server/contexts/auth/presentation/loaders/require-role-page";
import { loadResearchFundWritePermission } from "@/server/contexts/auth/presentation/loaders/require-research-fund-writer";

export default async function EditPoliticianPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRolePage("research_fund");
  const { id } = await params;
  // admin は全項目を編集できる。担当の議員室の research_fund ユーザーはプロフィールと顔写真だけ（#2031）
  const isAdmin = UserRoleModel.isAdmin(user.roles);
  const canWrite = await loadResearchFundWritePermission();
  if (!canWrite(id)) notFound();
  const [politician, organizations] = await Promise.all([
    loadPolitician(id),
    isAdmin ? loadPoliticalOrganizationsData() : Promise.resolve([]),
  ]);
  if (!politician) notFound();
  const photoUrl = await loadPoliticianPhotoUrl(politician.photoPath);
  return (
    <div>
      <PageHeader
        label="Politicians"
        title={isAdmin ? `${politician.name} を編集` : `${politician.name} のプロフィールを編集`}
      />
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
        profileOnly={!isAdmin}
      />
    </div>
  );
}
