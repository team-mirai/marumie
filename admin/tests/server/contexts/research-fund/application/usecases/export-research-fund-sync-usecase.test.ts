import { ExportResearchFundSyncUsecase } from "@/server/contexts/research-fund/application/usecases/export-research-fund-sync-usecase";
import { ResearchFundSyncExportNotFoundError } from "@/server/contexts/research-fund/domain/models/research-fund-sync-export";
import type { IResearchFundSyncExportRepository } from "@/server/contexts/research-fund/domain/repositories/research-fund-sync-export-repository.interface";
import type { IDatabaseMigrationRepository } from "@/server/contexts/shared/domain/repositories/database-migration-repository.interface";

function setup(sources: Awaited<ReturnType<IResearchFundSyncExportRepository["findSourcesByPoliticianIds"]>>) {
  const syncExportRepository = {
    findSourcesByPoliticianIds: jest.fn().mockResolvedValue(sources),
  };
  const migrationRepository: IDatabaseMigrationRepository = {
    findLatestAppliedMigrationName: jest.fn().mockResolvedValue("20261101000000_sample"),
  };
  const usecase = new ExportResearchFundSyncUsecase(syncExportRepository, migrationRepository);
  return { usecase, syncExportRepository };
}

const input = {
  sourceEnvironment: "production",
  exportedAt: new Date("2026-11-16T00:00:00.000Z"),
};

test("同じ議員が重複して選ばれても 1 回だけ読み出す", async () => {
  const { usecase, syncExportRepository } = setup([]);

  await usecase.execute({ ...input, politicianIds: ["1", "2", "1"] });

  expect(syncExportRepository.findSourcesByPoliticianIds).toHaveBeenCalledWith(["1", "2"]);
});

test("マイグレーション名と環境をメタに載せる", async () => {
  const { usecase } = setup([]);

  const result = await usecase.execute({ ...input, politicianIds: ["1"] });

  expect(result.meta).toMatchObject({
    sourceEnvironment: "production",
    latestMigrationName: "20261101000000_sample",
  });
});

test("見つからない議員があれば NotFound を投げる", async () => {
  const { usecase } = setup(null);

  await expect(usecase.execute({ ...input, politicianIds: ["99"] })).rejects.toBeInstanceOf(
    ResearchFundSyncExportNotFoundError,
  );
});
