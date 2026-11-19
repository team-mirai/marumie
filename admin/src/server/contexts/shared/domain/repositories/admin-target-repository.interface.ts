import type { AdminTarget } from "@/server/contexts/shared/domain/models/admin-target";
export interface IAdminTargetRepository {
  list(currentYear: number): Promise<AdminTarget[]>;
}
