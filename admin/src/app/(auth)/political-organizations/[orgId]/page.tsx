import "server-only";

import Link from "next/link";
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
      <div className="bg-card rounded-xl p-4">
        <div className="text-red-500 text-center p-10">
          {error instanceof Error ? error.message : "政治団体の取得に失敗しました"}
        </div>
      </div>
    );
  }

  const handleSubmit = async (formData: UpdatePoliticalOrganizationData) => {
    "use server";
    return await updatePoliticalOrganization(orgId, formData);
  };

  return (
    <div className="space-y-4">
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

      <div className="bg-card rounded-xl p-4">
        <h2 className="text-lg font-semibold text-white mb-3">関連機能</h2>
        <div className="flex gap-3">
          <Link
            href={`/political-organizations/${orgId}/report-profile`}
            className="bg-secondary text-white border border-border rounded-lg px-4 py-2.5 hover:bg-primary transition-colors no-underline"
          >
            報告書プロフィール
          </Link>
        </div>
      </div>
    </div>
  );
}
