import "server-only";
import type { IAdminTargetRepository } from "@/server/contexts/shared/domain/repositories/admin-target-repository.interface";

export class GetAdminTargetsUsecase {
  constructor(private repository: IAdminTargetRepository) {}
  async execute(key: string | undefined, currentYear: number) {
    const targets = await this.repository.list(currentYear);
    // 年が変わって候補の当年・前年から外れても、明示選択した年度を保持する。
    const savedOrganization = /^org:([1-9]\d*):(\d{4})$/.exec(key ?? "");
    if (
      savedOrganization &&
      Number(savedOrganization[2]) >= 1900 &&
      !targets.some((t) => t.key === key)
    ) {
      const organization = targets.find(
        (t) => t.kind === "political-organization" && t.organizationId === savedOrganization[1],
      );
      if (organization)
        targets.push({ ...organization, key: key as string, year: Number(savedOrganization[2]) });
    }
    // 未選択・削除済み対象を別の対象に自動でフォールバックさせない。
    return { targets, currentTarget: targets.find((target) => target.key === key) ?? null };
  }
}
