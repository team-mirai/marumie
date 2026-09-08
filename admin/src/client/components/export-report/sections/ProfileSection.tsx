import type { OrganizationReportProfile } from "@/server/contexts/report/domain/models/organization-report-profile";
import {
  KeyValueRow,
  KeyValueTable,
} from "@/client/components/export-report/sections/KeyValueTable";
import { SectionCard } from "@/client/components/export-report/sections/SectionCard";
import { SectionHeading } from "@/client/components/export-report/sections/SectionHeading";

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
    <div className="space-y-4">
      <SectionHeading>団体基本情報</SectionHeading>

      <SectionCard title="団体基本情報" formId="SYUUSHI07_01">
        <KeyValueTable>
          <KeyValueRow label="報告年" value={String(profile.financialYear)} />
          <KeyValueRow label="政治団体名称" value={profile.officialName || "-"} />
          <KeyValueRow label="ふりがな" value={profile.officialNameKana || "-"} />
          <KeyValueRow
            label="主たる事務所の所在地"
            value={formatAddress(profile.officeAddress, profile.officeAddressBuilding)}
          />
          <KeyValueRow label="代表者氏名" value={formatFullName(details.representative)} />
          <KeyValueRow label="会計責任者氏名" value={formatFullName(details.accountant)} />
          <KeyValueRow label="事務担当者" value={contactPersonsDisplay} />
          <KeyValueRow label="活動区域" value={getActivityAreaLabel(details.activityArea)} />
          <KeyValueRow
            label="国会議員関係政治団体の区分"
            value={getDietMemberRelationTypeLabel(details.dietMemberRelation?.type)}
          />
        </KeyValueTable>
      </SectionCard>
    </div>
  );
}
