import "server-only";

import { PoliticalOrganizationForm } from "@/client/components/political-organizations/PoliticalOrganizationForm";
import { loadPoliticalOrganizationData } from "@/server/contexts/shared/presentation/loaders/load-political-organization-data";
import { updatePoliticalOrganization } from "@/server/contexts/shared/presentation/actions/update-political-organization";
import type { UpdatePoliticalOrganizationData } from "@/server/contexts/shared/presentation/actions/update-political-organization";

interface EditPoliticalOrganizationPageProps {
  params: Promise<{ orgId: string }>;
}

export default async function EditPoliticalOrganizationPage({
  params,
}: EditPoliticalOrganizationPageProps) {
  const { orgId } = await params;

  let organization;
  try {
    organization = await loadPoliticalOrganizationData(orgId);
  } catch (error) {
    return (
      <div className="bg-primary-panel rounded-xl p-4">
        <div className="text-red-500 text-center p-10">
          {error instanceof Error
            ? error.message
            : "政治団体の取得に失敗しました"}
        </div>
      </div>
    );
  }

  const handleSubmit = async (formData: UpdatePoliticalOrganizationData) => {
    "use server";
    return await updatePoliticalOrganization(orgId, formData);
  };

  return (
    <PoliticalOrganizationForm
      initialData={{
        displayName: organization.displayName,
        orgName: organization.orgName || "",
        slug: organization.slug,
        description: organization.description || "",
      }}
      onSubmit={handleSubmit}
      submitButtonText="更新"
      title={`「${organization.displayName}」を編集`}
    />
  );
}
