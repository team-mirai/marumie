import "server-only";

import { redirect } from "next/navigation";
import { loadPoliticalOrganizationsData } from "@/server/contexts/shared/presentation/loaders/load-political-organizations-data";
import { PageHeader } from "@/client/components/layout/PageHeader";

export default async function ExportReportPage() {
  const organizations = await loadPoliticalOrganizationsData();

  if (organizations.length === 0) {
    return (
      <div>
        <PageHeader label="Report Export" title="報告書エクスポート" />
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            政治団体が登録されていません。先に政治団体を作成してください。
          </p>
        </div>
      </div>
    );
  }

  const defaultOrgId = organizations[0].id;
  const currentYear = new Date().getFullYear();

  redirect(`/export-report/${defaultOrgId}/${currentYear}`);
}
