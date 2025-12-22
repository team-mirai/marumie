import "server-only";

import { ExportReportClient } from "@/client/components/export-report/ExportReportClient";
import { loadPoliticalOrganizationsData } from "@/server/contexts/shared/presentation/loaders/load-political-organizations-data";

export default async function ExportReportPage() {
  const organizations = await loadPoliticalOrganizationsData();

  return (
    <div className="bg-card rounded-xl p-4">
      <h1 className="text-2xl font-bold text-white mb-1">報告書エクスポート</h1>
      <p className="text-muted-foreground mb-6">
        政治資金報告書をXML形式で出力します。現在は14号様式(その6)「その他の収入」のみ対応しています。
      </p>
      <ExportReportClient organizations={organizations} />
    </div>
  );
}
