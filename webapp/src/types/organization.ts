import type { OrganizationKind } from "@/server/contexts/public-finance/domain/models/organization-kind";

export type OrganizationData = {
  slug: string;
  orgName: string | null;
  displayName: string;
  /** 政党か、それ以外の政治団体か（トップのカードと同じ基準） */
  kind: OrganizationKind;
  /** 代表者の顔写真を配信できるか（登録済みで、ストレージが使える環境） */
  hasPhoto: boolean;
};

export type OrganizationsResponse = {
  default: string | null;
  organizations: OrganizationData[];
};
