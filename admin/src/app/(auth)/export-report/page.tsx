import "server-only";

import { redirect } from "next/navigation";
import { loadPoliticalOrganizationsData } from "@/server/contexts/shared/presentation/loaders/load-political-organizations-data";

export default async function ExportReportPage() {
  const organizations = await loadPoliticalOrganizationsData();

  if (organizations.length === 0) {
    return (
      <div className="bg-card rounded-xl p-4">
        <h1 className="text-2xl font-bold text-white mb-1">報告書エクスポート</h1>
        <p className="text-muted-foreground">
          政治団体が登録されていません。先に政治団体を作成してください。
        </p>
      </div>
    );
  }

  const defaultOrgId = organizations[0].id;
  const currentYear = new Date().getFullYear();

  redirect(`/export-report/${defaultOrgId}/${currentYear}`);
}
