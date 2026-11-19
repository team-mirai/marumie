import "server-only";
import {
  asOrganizationTarget,
  type OrganizationTarget,
} from "@/server/contexts/shared/domain/models/admin-target";
import { loadAdminTargets } from "@/server/contexts/shared/presentation/loaders/load-admin-targets";

/** 現在選択中のグローバル対象を「政治団体 × 年度」として取得する（未選択・議員室モードなら null）。 */
export async function loadCurrentOrganizationTarget(): Promise<OrganizationTarget | null> {
  const { currentTarget } = await loadAdminTargets();
  return asOrganizationTarget(currentTarget);
}
