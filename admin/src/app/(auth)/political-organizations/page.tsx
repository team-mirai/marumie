import "server-only";

import Link from "next/link";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { loadPoliticalOrganizationsData } from "@/server/contexts/shared/presentation/loaders/load-political-organizations-data";
import { PoliticalOrganizationCard } from "@/client/components/political-organizations/PoliticalOrganizationCard";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { Button } from "@/client/components/ui";

export default async function PoliticalOrganizationsPage() {
  const organizations = await loadPoliticalOrganizationsData();

  return (
    <div>
      <PageHeader
        label="Organizations"
        title="政治団体一覧"
        actions={
          <Button className="text-[13px] tracking-[0.06em]" asChild>
            <Link href="/political-organizations/new">
              <Plus />
              新規作成
            </Link>
          </Button>
        }
      />

      {organizations.length === 0 ? (
        <div className="rounded-lg border border-border bg-card px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">政治団体が登録されていません</p>
          <Button className="mt-4" asChild>
            <Link href="/political-organizations/new">
              <Plus />
              最初の政治団体を作成
            </Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {organizations.map((org) => (
            <PoliticalOrganizationCard key={org.id} organization={org} />
          ))}
        </div>
      )}
    </div>
  );
}
