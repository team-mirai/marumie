import { type UserRole, UserRoleModel } from "@/server/contexts/auth/domain/models/user-role";

export type AdminTarget = {
  key: string;
  name: string;
  year: number;
} & (
  | { kind: "political-organization"; organizationId: string }
  | { kind: "research-fund"; politicianId: string; bookId: string; draftCount: number }
);

export function targetDestination(target: AdminTarget): string {
  return target.kind === "research-fund"
    ? `/politicians/${target.politicianId}/books`
    : "/political-organizations";
}

/**
 * ユーザーのロールでその対象を選べるか。
 * 政治団体は政治資金（political_fund）、議員室は調査研究費（research_fund）の機能なので、
 * 使えない機能の対象は対象切り替えにも出さない（admin は全対象を選べる）。
 */
export function isTargetAvailableFor(target: AdminTarget, roles: readonly UserRole[]): boolean {
  return UserRoleModel.canUse(
    roles,
    target.kind === "research-fund" ? ["research_fund"] : ["political_fund"],
  );
}

/** 政治団体系ページが必要とする「政治団体 × 年度」。グローバル対象から取り出す。 */
export type OrganizationTarget = {
  organizationId: string;
  name: string;
  year: number;
};

/**
 * グローバル対象が政治団体のときだけ OrganizationTarget を返す。
 * 議員室（調研費）を選んでいる場合や未選択の場合は、別の団体に勝手に
 * フォールバックせず null を返し、画面側で対象の選択を促す。
 */
export function asOrganizationTarget(target: AdminTarget | null): OrganizationTarget | null {
  if (target?.kind !== "political-organization") return null;
  return { organizationId: target.organizationId, name: target.name, year: target.year };
}
