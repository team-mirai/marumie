import "server-only";

import { PoliticalOrganizationForm } from "@/client/components/political-organizations/PoliticalOrganizationForm";
import { createPoliticalOrganization } from "@/server/contexts/shared/presentation/actions/create-political-organization";
import type { CreatePoliticalOrganizationData } from "@/server/contexts/shared/presentation/actions/create-political-organization";

export default function NewPoliticalOrganizationPage() {
  const handleSubmit = async (formData: CreatePoliticalOrganizationData) => {
    "use server";
    return await createPoliticalOrganization(formData);
  };

  return (
    <PoliticalOrganizationForm
      onSubmit={handleSubmit}
      submitButtonText="作成"
      title="新しい政治団体を作成"
    />
  );
}
