import "server-only";

import Link from "next/link";
import { loadPoliticalOrganizationData } from "@/server/contexts/shared/presentation/loaders/load-political-organization-data";
import { loadOrganizationProfileData } from "@/server/contexts/report/presentation/loaders/organization-profile-loader";
import { ReportProfileForm } from "@/client/components/report-profile/ReportProfileForm";

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
  const financialYear = year ? parseInt(year, 10) : currentYear;

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

  const profile = await loadOrganizationProfileData(orgId, financialYear);

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

      <label className="block mb-4 font-medium text-white">
        報告年
        <select
          className="bg-primary-input text-white border border-primary-border rounded-lg px-3 py-2.5 w-32 mt-2 block font-normal"
          defaultValue={financialYear}
          onChange={(e) => {
            window.location.href = `/political-organizations/${orgId}/report-profile?year=${e.target.value}`;
          }}
        >
          {Array.from({ length: 10 }, (_, i) => currentYear - i).map((y) => (
            <option key={y} value={y}>
              {y}年
            </option>
          ))}
        </select>
      </label>

      <ReportProfileForm
        politicalOrganizationId={orgId}
        financialYear={financialYear}
        initialData={profile}
      />
    </div>
  );
}
