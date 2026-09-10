import "server-only";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { PoliticianForm } from "@/client/components/politicians/PoliticianForm";
import { loadPoliticalOrganizationsData } from "@/server/contexts/shared/presentation/loaders/load-political-organizations-data";

export default async function NewPoliticianPage() {
  const organizations = await loadPoliticalOrganizationsData();
  return (
    <div>
      <PageHeader label="Politicians" title="議員を追加" />
      <PoliticianForm
        organizations={organizations.map(({ id, displayName }) => ({ id, displayName }))}
      />
    </div>
  );
}
