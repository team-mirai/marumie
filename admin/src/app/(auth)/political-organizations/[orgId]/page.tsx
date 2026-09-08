import "server-only";

import Link from "next/link";
import { PoliticalOrganizationForm } from "@/client/components/political-organizations/PoliticalOrganizationForm";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { BackLink } from "@/client/components/layout/BackLink";
import { Button } from "@/client/components/ui";
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
      <div className="rounded-lg border border-border bg-card p-10 text-center text-sm text-destructive">
        {error instanceof Error ? error.message : "政治団体の取得に失敗しました"}
      </div>
    );
  }

  const handleSubmit = async (formData: UpdatePoliticalOrganizationData) => {
    "use server";
    return await updatePoliticalOrganization(orgId, formData);
  };

  return (
    <div>
      <BackLink href="/political-organizations">政治団体一覧に戻る</BackLink>

      <PageHeader label="Organizations" title={`「${organization.displayName}」を編集`} />

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
        />

        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-3 text-base font-bold text-foreground">関連機能</h2>
          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link href={`/political-organizations/${orgId}/report-profile`}>
                報告書プロフィール
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
