import "server-only";

import Link from "next/link";
import { notFound } from "next/navigation";
import { loadPoliticalOrganizationsData } from "@/server/contexts/shared/presentation/loaders/load-political-organizations-data";
import { loadReportPreviewData } from "@/server/contexts/report/presentation/loaders/report-preview-loader";
import type { ReportPreviewData } from "@/server/contexts/report/presentation/loaders/report-preview-loader";
import { ExportReportSelectors } from "@/client/components/export-report/ExportReportSelectors";
import { ExportReportPreview } from "@/client/components/export-report/ExportReportPreview";
import { DownloadButton } from "@/client/components/export-report/DownloadButton";
import { PageHeader } from "@/client/components/layout/PageHeader";

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

  let previewData: ReportPreviewData | null = null;
  let errorMessage: string | null = null;
  let isProfileMissing = false;

  try {
    previewData = await loadReportPreviewData(orgId, financialYear);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Profile not found")) {
      isProfileMissing = true;
      errorMessage = `${financialYear}年の報告書プロフィールが登録されていません。先にプロフィールを登録してください。`;
    } else {
      errorMessage = error instanceof Error ? error.message : "不明なエラーが発生しました";
    }
  }

  const currentYear = new Date().getFullYear();

  return (
    <div>
      <PageHeader
        label="Report Export"
        title="報告書エクスポート"
        description="政治資金報告書をエクスポートします"
      />

      <div className="rounded-lg border border-border bg-card p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <ExportReportSelectors
            organizations={organizations}
            selectedOrgId={orgId}
            selectedYear={financialYear}
            currentYear={currentYear}
          />
          {previewData && (
            <DownloadButton politicalOrganizationId={orgId} financialYear={financialYear} />
          )}
        </div>

        {errorMessage ? (
          isProfileMissing ? (
            <div className="rounded-lg border border-primary-active bg-accent p-3 text-sm text-accent-foreground">
              {errorMessage}
              <Link
                href={`/political-organizations/${orgId}/report-profile?year=${financialYear}`}
                className="ml-2 font-bold underline hover:text-primary-hover"
              >
                プロフィール登録ページへ
              </Link>
            </div>
          ) : (
            <div className="rounded-lg border border-destructive bg-destructive-hover p-3 text-sm text-destructive">
              {errorMessage}
            </div>
          )
        ) : previewData ? (
          <ExportReportPreview
            xml={previewData.xml}
            reportData={previewData.reportData}
            summaryData={previewData.summaryData}
          />
        ) : null}
      </div>
    </div>
  );
}
