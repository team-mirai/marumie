import "server-only";

import Link from "next/link";
import { loadPoliticalOrganizationData } from "@/server/contexts/shared/presentation/loaders/load-political-organization-data";
import { loadOrganizationProfileData } from "@/server/contexts/report/presentation/loaders/organization-profile-loader";
import { ReportProfileForm } from "@/client/components/report-profile/ReportProfileForm";
import { YearSelector } from "@/client/components/report-profile/YearSelector";

interface ReportProfilePageProps {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ year?: string }>;
}

export default async function ReportProfilePage({
  params,
  searchParams,
}: ReportProfilePageProps) {
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
      <div className="bg-primary-panel rounded-xl p-4">
        <div className="text-red-500 text-center p-10">
          {error instanceof Error
            ? error.message
            : "政治団体の取得に失敗しました"}
        </div>
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
    <div className="bg-primary-panel rounded-xl p-4">
      <div className="mb-5">
        <Link
          href="/political-organizations"
          className="text-primary-muted no-underline hover:text-white transition-colors"
        >
          ← 政治団体一覧に戻る
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-white mb-4">
        「{organization.displayName}」の報告書プロフィール
      </h1>

      <div className="block mb-4">
        <YearSelector
          orgId={orgId}
          financialYear={financialYear}
          currentYear={currentYear}
        />
      </div>

      <ReportProfileForm
        politicalOrganizationId={orgId}
        financialYear={financialYear}
        initialData={profile}
      />
    </div>
  );
}
