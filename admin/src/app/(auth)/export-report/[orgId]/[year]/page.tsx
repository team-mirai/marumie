import "server-only";

import Link from "next/link";
import { notFound } from "next/navigation";
import { loadPoliticalOrganizationsData } from "@/server/contexts/shared/presentation/loaders/load-political-organizations-data";
import { loadReportPreviewData } from "@/server/contexts/report/presentation/loaders/report-preview-loader";
import type { ReportData } from "@/server/contexts/report/domain/models/report-data";
import { ExportReportSelectors } from "@/client/components/export-report/ExportReportSelectors";
import { ExportReportPreview } from "@/client/components/export-report/ExportReportPreview";
import { DownloadButton } from "@/client/components/export-report/DownloadButton";

interface ExportReportDetailPageProps {
  params: Promise<{
    orgId: string;
    year: string;
  }>;
}

export default async function ExportReportDetailPage({ params }: ExportReportDetailPageProps) {
  const { orgId, year } = await params;
  const financialYear = Number.parseInt(year, 10);

  if (Number.isNaN(financialYear)) {
    notFound();
  }

  const organizations = await loadPoliticalOrganizationsData();

  const organization = organizations.find((org) => org.id === orgId);
  if (!organization) {
    notFound();
  }

  let previewData: {
    xml: string;
    reportData: ReportData;
  } | null = null;
  let errorMessage: string | null = null;

  try {
    previewData = await loadReportPreviewData(orgId, financialYear);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Profile not found")) {
      errorMessage = `${financialYear}年の報告書プロフィールが登録されていません。先にプロフィールを登録してください。`;
    } else {
      errorMessage = error instanceof Error ? error.message : "不明なエラーが発生しました";
    }
  }

  const currentYear = new Date().getFullYear();

  return (
    <div className="bg-card rounded-xl p-4">
      <h1 className="text-2xl font-bold text-white mb-1">報告書エクスポート</h1>
      <p className="text-muted-foreground mb-6">政治資金報告書をXML形式で出力します。</p>

      <div className="space-y-6">
        <ExportReportSelectors
          organizations={organizations}
          selectedOrgId={orgId}
          selectedYear={financialYear}
          currentYear={currentYear}
        />

        {errorMessage ? (
          <div className="rounded-lg px-3 py-2 bg-red-500/20 text-red-200">
            {errorMessage}
            {errorMessage.includes("プロフィール") && (
              <Link
                href={`/political-organizations/${orgId}/report-profile?year=${financialYear}`}
                className="ml-2 underline hover:no-underline"
              >
                プロフィール登録ページへ
              </Link>
            )}
          </div>
        ) : previewData ? (
          <>
            <DownloadButton politicalOrganizationId={orgId} financialYear={financialYear} />
            <ExportReportPreview xml={previewData.xml} reportData={previewData.reportData} />
          </>
        ) : null}
      </div>
    </div>
  );
}
