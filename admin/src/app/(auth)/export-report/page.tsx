import "server-only";

import Link from "next/link";
import { loadCurrentOrganizationTarget } from "@/server/contexts/shared/presentation/loaders/load-current-organization-target";
import { loadReportPreviewData } from "@/server/contexts/report/presentation/loaders/report-preview-loader";
import type { ReportPreviewData } from "@/server/contexts/report/presentation/loaders/report-preview-loader";
import { ExportReportPreview } from "@/client/components/export-report/ExportReportPreview";
import { DownloadButton } from "@/client/components/export-report/DownloadButton";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { CurrentTargetBar } from "@/client/components/layout/CurrentTargetBar";
import { TargetRequiredNotice } from "@/client/components/layout/TargetRequiredNotice";

export default async function ExportReportPage() {
  const target = await loadCurrentOrganizationTarget();

  if (!target) {
    return <TargetRequiredNotice label="Report Export" title="報告書エクスポート" />;
  }

  const { organizationId, year: financialYear } = target;

  let previewData: ReportPreviewData | null = null;
  let errorMessage: string | null = null;
  let isProfileMissing = false;

  try {
    previewData = await loadReportPreviewData(organizationId, financialYear);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Profile not found")) {
      isProfileMissing = true;
      errorMessage = `${financialYear}年の報告書プロフィールが登録されていません。先にプロフィールを登録してください。`;
    } else {
      errorMessage = error instanceof Error ? error.message : "不明なエラーが発生しました";
    }
  }

  return (
    <div>
      <PageHeader
        label="Report Export"
        title="報告書エクスポート"
        description="政治資金報告書をエクスポートします"
      />

      <CurrentTargetBar target={target} note="の報告書を出力します" />

      <div className="rounded-lg border border-border bg-card p-6">
        {previewData && (
          <div className="mb-6 flex justify-end">
            <DownloadButton
              politicalOrganizationId={organizationId}
              financialYear={financialYear}
            />
          </div>
        )}

        {errorMessage ? (
          isProfileMissing ? (
            <div className="rounded-lg border border-primary-active bg-accent p-3 text-sm text-accent-foreground">
              {errorMessage}
              <Link
                href={`/political-organizations/${organizationId}/report-profile?year=${financialYear}`}
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
