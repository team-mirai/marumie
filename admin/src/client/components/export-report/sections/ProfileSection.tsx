import type { OrganizationReportProfile } from "@/server/contexts/report/domain/models/organization-report-profile";

interface ProfileSectionProps {
  profile: OrganizationReportProfile;
}

function getActivityAreaLabel(activityArea: string | undefined): string {
  switch (activityArea) {
    case "1":
      return "二以上の都道府県にまたがって活動";
    case "2":
      return "一つの都道府県区域で活動";
    default:
      return "-";
  }
}

function getDietMemberRelationTypeLabel(type: string | undefined): string {
  switch (type) {
    case "0":
      return "指定無し";
    case "1":
      return "1号団体";
    case "2":
      return "2号団体";
    case "3":
      return "1号団体かつ2号団体";
    default:
      return "-";
  }
}

function formatFullName(person: { lastName: string; firstName: string } | undefined): string {
  if (!person) return "-";
  return `${person.lastName} ${person.firstName}`;
}

function formatAddress(
  address: string | null | undefined,
  building: string | null | undefined,
): string {
  if (!address) return "-";
  if (building) {
    return `${address} ${building}`;
  }
  return address;
}

interface ProfileRowProps {
  label: string;
  value: string;
}

function ProfileRow({ label, value }: ProfileRowProps) {
  return (
    <tr className="border border-black">
      <th className="py-2 px-4 text-left font-medium text-gray-700 bg-gray-50 w-1/3 border border-black">
        {label}
      </th>
      <td className="py-2 px-4 text-gray-900 border border-black">{value}</td>
    </tr>
  );
}

export function ProfileSection({ profile }: ProfileSectionProps) {
  const { details } = profile;

  const contactPersonsDisplay =
    details.contactPersons && details.contactPersons.length > 0
      ? details.contactPersons
          .map((person) => {
            const name = `${person.lastName} ${person.firstName}`;
            return person.tel ? `${name} (${person.tel})` : name;
          })
          .join("、")
      : "-";

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">団体基本情報</h2>

      <div className="bg-white border border-black overflow-hidden">
        <div className="bg-gray-100 border-b border-black px-4 py-3">
          <h3 className="text-lg font-semibold text-black">団体基本情報 (SYUUSHI07_01)</h3>
        </div>
        <div className="p-4">
          <table className="w-full border-collapse border border-black">
            <tbody>
              <ProfileRow label="報告年" value={String(profile.financialYear)} />
              <ProfileRow label="政治団体名称" value={profile.officialName || "-"} />
              <ProfileRow label="ふりがな" value={profile.officialNameKana || "-"} />
              <ProfileRow
                label="主たる事務所の所在地"
                value={formatAddress(profile.officeAddress, profile.officeAddressBuilding)}
              />
              <ProfileRow label="代表者氏名" value={formatFullName(details.representative)} />
              <ProfileRow label="会計責任者氏名" value={formatFullName(details.accountant)} />
              <ProfileRow label="事務担当者" value={contactPersonsDisplay} />
              <ProfileRow label="活動区域" value={getActivityAreaLabel(details.activityArea)} />
              <ProfileRow
                label="国会議員関係政治団体の区分"
                value={getDietMemberRelationTypeLabel(details.dietMemberRelation?.type)}
              />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
