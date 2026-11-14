import type { PrismaClient } from "@prisma/client";
import { PrismaPoliticalOrganizationRepository } from "@/server/contexts/public-finance/infrastructure/repositories/prisma-political-organization.repository";

describe("PrismaPoliticalOrganizationRepository.findTypeCodesByIds", () => {
  const createRepository = (
    profiles: { politicalOrganizationId: bigint; details: unknown }[],
  ) => {
    const findMany = jest.fn().mockResolvedValue(profiles);
    const prisma = { organizationReportProfile: { findMany } } as unknown as PrismaClient;
    return { repository: new PrismaPoliticalOrganizationRepository(prisma), findMany };
  };

  it("年ごとの政治団体区分を、政治団体の ID ごとにまとめる", async () => {
    const { repository, findMany } = createRepository([
      { politicalOrganizationId: BigInt(1), details: { organizationType: "01" } },
      { politicalOrganizationId: BigInt(1), details: { organizationType: "02" } },
      { politicalOrganizationId: BigInt(2), details: { organizationType: "04" } },
    ]);

    const result = await repository.findTypeCodesByIds(["1", "2"]);

    expect(result).toEqual(
      new Map([
        ["1", ["01", "02"]],
        ["2", ["04"]],
      ]),
    );
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { politicalOrganizationId: { in: [BigInt(1), BigInt(2)] } },
      }),
    );
  });

  it("区分が未入力の年は含めない", async () => {
    const { repository } = createRepository([
      { politicalOrganizationId: BigInt(1), details: {} },
      { politicalOrganizationId: BigInt(1), details: { organizationType: "" } },
      { politicalOrganizationId: BigInt(2), details: [] },
    ]);

    await expect(repository.findTypeCodesByIds(["1", "2"])).resolves.toEqual(new Map());
  });
});
