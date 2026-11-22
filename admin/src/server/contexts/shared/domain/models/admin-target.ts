import { type UserRole, UserRoleModel } from "@/server/contexts/auth/domain/models/user-role";

export type AdminTarget = {
  key: string;
  name: string;
  year: number;
} & (
  | { kind: "political-organization"; organizationId: string }
  | { kind: "research-fund"; politicianId: string; bookId: string; draftCount: number }
);

/**
 * 管理対象のキー（対象切り替えの選択値。cookie に保存する）。
 * 政治団体は「団体 × 年度」、議員室は年度帳簿 1 冊を 1 つの対象として表す。
 */
export const AdminTargetKey = {
  organization(organizationId: string | number | bigint, year: number): string {
    return `org:${organizationId}:${year}`;
  },
  book(bookId: string | number | bigint): string {
    return `book:${bookId}`;
  },
  /** 政治団体のキーを団体 ID と年度に分解する。政治団体のキーとして読めなければ null */
  parseOrganization(key: string | undefined): { organizationId: string; year: number } | null {
    const match = /^org:([1-9]\d*):(\d{4})$/.exec(key ?? "");
    if (!match || Number(match[2]) < 1900) return null;
    return { organizationId: match[1], year: Number(match[2]) };
  },
};

/**
 * 政治団体で選べる年度（新しい順）。
 * データのない団体でも当年・前年を選べ、既存データ（取引・報告書情報）の年度も失わない。
 * @param dataYears その団体にデータがある年度
 */
export function selectableOrganizationYears(
  currentYear: number,
  dataYears: Iterable<number>,
): number[] {
  return [...new Set([currentYear, currentYear - 1, ...dataYears])].sort((a, b) => b - a);
}

/**
 * 保存済みの選択が、選べる年度から外れた政治団体の年度なら、その年度を候補に足して返す。
 * 年が変わって候補の当年・前年から外れても、明示選択した年度を保持するため。
 * 団体自体が候補に無い（削除済み・使えない）場合は足さない。
 * @param targets ユーザーが選べる対象
 * @param key 保存済みの選択
 */
export function withSavedOrganizationYear(
  targets: readonly AdminTarget[],
  key: string | undefined,
): AdminTarget[] {
  const saved = AdminTargetKey.parseOrganization(key);
  if (!saved || targets.some((t) => t.key === key)) return [...targets];
  const organization = targets.find(
    (t) => t.kind === "political-organization" && t.organizationId === saved.organizationId,
  );
  if (!organization) return [...targets];
  return [
    ...targets,
    {
      ...organization,
      key: AdminTargetKey.organization(saved.organizationId, saved.year),
      year: saved.year,
    },
  ];
}

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

/**
 * 対象が未選択のときに選んだ状態で始める対象（#1773）。
 * 秘書は基本的に 1 つの議員室を担当するので、担当がちょうど 1 人ならその議員室の最新年度の帳簿を選ぶ
 * （取り違えを防ぐため）。担当が 0 人・複数人、または担当の議員に帳簿が無ければ未選択のままにする。
 * @param targets ユーザーが選べる対象
 * @param assignedPoliticianIds ユーザーが担当する議員の ID
 */
export function defaultTargetFor(
  targets: readonly AdminTarget[],
  assignedPoliticianIds: readonly string[],
): AdminTarget | null {
  if (assignedPoliticianIds.length !== 1) return null;
  const [politicianId] = assignedPoliticianIds;
  return targets.reduce<AdminTarget | null>(
    (latest, target) =>
      target.kind === "research-fund" &&
      target.politicianId === politicianId &&
      (latest === null || target.year > latest.year)
        ? target
        : latest,
    null,
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
