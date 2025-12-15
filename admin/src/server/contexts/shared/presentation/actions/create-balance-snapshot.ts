"use server";

import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaBalanceSnapshotRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-balance-snapshot.repository";
import { CreateBalanceSnapshotUsecase } from "@/server/contexts/shared/application/usecases/create-balance-snapshot-usecase";

export interface CreateBalanceSnapshotData {
  politicalOrganizationId: string;
  snapshotDate: string;
  balance: number;
}

export async function createBalanceSnapshot(data: CreateBalanceSnapshotData) {
  try {
    const { politicalOrganizationId, snapshotDate, balance } = data;

    if (!politicalOrganizationId.trim()) {
      throw new Error("政治団体IDは必須です");
    }

    if (!snapshotDate.trim()) {
      throw new Error("スナップショット日は必須です");
    }

    if (balance === undefined || balance === null) {
      throw new Error("残高は必須です");
    }

    const repository = new PrismaBalanceSnapshotRepository(prisma);
    const usecase = new CreateBalanceSnapshotUsecase(repository);

    await usecase.execute({
      political_organization_id: politicalOrganizationId,
      snapshot_date: new Date(snapshotDate),
      balance,
    });

    return { success: true };
  } catch (error) {
    console.error("Error creating balance snapshot:", error);

    throw new Error(
      error instanceof Error ? error.message : "残高スナップショットの作成に失敗しました",
    );
  }
}
