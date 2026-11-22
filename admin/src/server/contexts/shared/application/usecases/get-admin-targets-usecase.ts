import "server-only";
import type { UserRole } from "@/server/contexts/auth/domain/models/user-role";
import {
  defaultTargetFor,
  isTargetAvailableFor,
  withSavedOrganizationYear,
} from "@/server/contexts/shared/domain/models/admin-target";
import type { IAdminTargetRepository } from "@/server/contexts/shared/domain/repositories/admin-target-repository.interface";

export class GetAdminTargetsUsecase {
  constructor(private repository: IAdminTargetRepository) {}
  async execute(
    key: string | undefined,
    currentYear: number,
    roles: readonly UserRole[],
    assignedPoliticianIds: readonly string[] = [],
  ) {
    // 使えない機能の対象は選択肢にも出さず、保存済みの選択も無効にする。
    const available = (await this.repository.list(currentYear)).filter((target) =>
      isTargetAvailableFor(target, roles),
    );
    // 年が変わって候補の当年・前年から外れても、明示選択した年度を保持する。
    const targets = withSavedOrganizationYear(available, key);
    // 一度も選んでいなければ、担当の議員室から始める（担当がちょうど 1 人のときだけ）。
    if (key === undefined)
      return { targets, currentTarget: defaultTargetFor(targets, assignedPoliticianIds) };
    // 無効・削除済みの対象を別の対象に自動でフォールバックさせない。
    return { targets, currentTarget: targets.find((target) => target.key === key) ?? null };
  }
}
