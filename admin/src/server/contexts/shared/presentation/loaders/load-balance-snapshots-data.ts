import "server-only";

import {
  BalanceSnapshot,
  type BalanceSnapshotOverview,
} from "@/server/contexts/shared/domain/models/balance-snapshot";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaBalanceSnapshotRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-balance-snapshot.repository";

export async function loadBalanceSnapshotsData(
  politicalOrganizationId: string,
): Promise<BalanceSnapshotOverview> {
  try {
    const repository = new PrismaBalanceSnapshotRepository(prisma);

    const snapshots = await repository.findAll({
      political_organization_id: politicalOrganizationId,
    });

    return { snapshots, current: BalanceSnapshot.current(snapshots) };
  } catch (error) {
    console.error("Error fetching balance snapshots:", error);
    throw new Error("残高スナップショットの取得に失敗しました");
  }
}
