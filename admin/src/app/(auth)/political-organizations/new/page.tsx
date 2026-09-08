import "server-only";

import Link from "next/link";
import { PoliticalOrganizationForm } from "@/client/components/political-organizations/PoliticalOrganizationForm";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { createPoliticalOrganization } from "@/server/contexts/shared/presentation/actions/create-political-organization";
import type { CreatePoliticalOrganizationData } from "@/server/contexts/shared/presentation/actions/create-political-organization";

export default function NewPoliticalOrganizationPage() {
  const handleSubmit = async (formData: CreatePoliticalOrganizationData) => {
    "use server";
    return await createPoliticalOrganization(formData);
  };

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/political-organizations"
          className="text-muted-foreground no-underline hover:text-foreground transition-colors"
        >
          ← 政治団体一覧に戻る
        </Link>
      </div>

      <PageHeader label="Organizations" title="新しい政治団体を作成" />

      <PoliticalOrganizationForm onSubmit={handleSubmit} submitButtonText="作成" />
    </div>
  );
}
