import "server-only";

import { loadPoliticalOrganizationData } from "@/server/contexts/shared/presentation/loaders/load-political-organization-data";
import { loadOrganizationProfileData } from "@/server/contexts/report/presentation/loaders/organization-profile-loader";
import { ReportProfileForm } from "@/client/components/report-profile/ReportProfileForm";
import { YearSelector } from "@/client/components/report-profile/YearSelector";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { BackLink } from "@/client/components/layout/BackLink";

interface ReportProfilePageProps {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ year?: string }>;
}

export default async function ReportProfilePage({ params, searchParams }: ReportProfilePageProps) {
  const { orgId } = await params;
  const { year } = await searchParams;

  const currentYear = new Date().getFullYear();
  const parsedYear = year ? parseInt(year, 10) : currentYear;
  const financialYear = Number.isNaN(parsedYear) ? currentYear : parsedYear;

  let organization;
  try {
    organization = await loadPoliticalOrganizationData(orgId);
  } catch (error) {
    return (
      <div className="rounded-lg border border-border bg-card p-10 text-center text-sm text-destructive">
        {error instanceof Error ? error.message : "政治団体の取得に失敗しました"}
      </div>
    );
  }

  // プロフィールが存在しない場合は新規作成なので null で初期化
  let profile;
  try {
    profile = await loadOrganizationProfileData(orgId, financialYear);
  } catch {
    profile = null;
  }

  return (
    <div>
      <BackLink href="/political-organizations">政治団体一覧に戻る</BackLink>

      <PageHeader
        label="Report Profile"
        title={`「${organization.displayName}」の報告書プロフィール`}
        actions={
          <YearSelector orgId={orgId} financialYear={financialYear} currentYear={currentYear} />
        }
      />

      <ReportProfileForm
        key={financialYear}
        politicalOrganizationId={orgId}
        financialYear={financialYear}
        initialData={profile}
      />
    </div>
  );
}
