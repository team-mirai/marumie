import "server-only";
import { Prisma, type PrismaClient, type ResearchFundPayee } from "@prisma/client";
import {
  PayeeError,
  type Payee,
  type PayeeInput,
} from "@/server/contexts/research-fund/domain/models/payee";
import type { PayeeRepository } from "@/server/contexts/research-fund/domain/repositories/payee-repository.interface";

function model(row: ResearchFundPayee): Payee {
  return {
    id: String(row.id),
    politicianId: String(row.politicianId),
    name: row.name,
    postalCode: row.postalCode,
    address: row.address,
    invoiceRegistrationNumber: row.invoiceRegistrationNumber,
  };
}
// 支払先は (議員, 名称, 住所) で一意。同じ相手を二重に作らせない。
async function unique<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      throw new PayeeError("同じ名称・住所の支払先がすでに登録されています");
    throw error;
  }
}
export class PrismaPayeeRepository implements PayeeRepository {
  constructor(private prisma: PrismaClient) {}
  async list(politicianId: string) {
    const rows = await this.prisma.researchFundPayee.findMany({
      where: { politicianId: BigInt(politicianId) },
      include: { _count: { select: { journalEntries: true } } },
      orderBy: [{ name: "asc" }, { address: "asc" }],
    });
    return rows.map((row) => ({ ...model(row), usageCount: row._count.journalEntries }));
  }
  async find(politicianId: string, id: string) {
    const row = await this.prisma.researchFundPayee.findFirst({
      where: { id: BigInt(id), politicianId: BigInt(politicianId) },
    });
    return row ? model(row) : null;
  }
  async create(politicianId: string, input: PayeeInput) {
    return model(
      await unique(() =>
        this.prisma.researchFundPayee.create({
          data: { ...input, politicianId: BigInt(politicianId) },
        }),
      ),
    );
  }
  // 議員で絞り込んで更新し、別の議員の支払先は id を知っていても変更できないようにする。
  async update(politicianId: string, id: string, input: PayeeInput) {
    return unique(() =>
      this.prisma.$transaction(async (tx) => {
        const result = await tx.researchFundPayee.updateMany({
          where: { id: BigInt(id), politicianId: BigInt(politicianId) },
          data: input,
        });
        if (result.count !== 1) throw new PayeeError("支払先が見つかりません");
        return model(await tx.researchFundPayee.findUniqueOrThrow({ where: { id: BigInt(id) } }));
      }),
    );
  }
}
