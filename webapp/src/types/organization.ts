export type OrganizationData = {
  slug: string;
  orgName: string | null;
  displayName: string;
};

export type OrganizationsResponse = {
  default: string | null;
  organizations: OrganizationData[];
};
