import type { PrismaClient } from "@prisma/client";
import { PrismaAdminTargetRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-admin-target.repository";
test("団体×年度と議員×帳簿をシリアライズし、下書きのみを帳簿ごとに数える", async () => {
  const politicalOrganization = { findMany: jest.fn().mockResolvedValue([
    { id: BigInt(1), displayName: "団体", transactions: [{ financialYear: 2023 }, { financialYear: 2026 }], reportProfiles: [{ financialYear: 2024 }] },
    { id: BigInt(2), displayName: "空の団体", transactions: [], reportProfiles: [] },
  ]) };
  const researchFundBook = { findMany: jest.fn().mockResolvedValue([
    { id: BigInt(7), politicianId: BigInt(3), financialYear: 2026, politician: { name: "議員" }, _count: { journalEntries: 2 } },
    { id: BigInt(8), politicianId: BigInt(3), financialYear: 2025, politician: { name: "議員" }, _count: { journalEntries: 0 } },
  ]) };
  const targets = await new PrismaAdminTargetRepository({ politicalOrganization, researchFundBook } as unknown as PrismaClient).list(2026);
  expect(targets.filter((t) => t.kind === "political-organization" && t.organizationId === "1").map((t) => t.year)).toEqual([2026, 2025, 2024, 2023]);
  expect(targets.filter((t) => t.kind === "political-organization" && t.organizationId === "2").map((t) => t.year)).toEqual([2026, 2025]);
  expect(targets.filter((t) => t.kind === "research-fund")).toEqual([
    { key: "book:7", kind: "research-fund", bookId: "7", politicianId: "3", name: "議員", year: 2026, draftCount: 2 },
    { key: "book:8", kind: "research-fund", bookId: "8", politicianId: "3", name: "議員", year: 2025, draftCount: 0 },
  ]);
  expect(researchFundBook.findMany).toHaveBeenCalledWith(expect.objectContaining({ select: expect.objectContaining({ _count: { select: { journalEntries: { where: { status: "draft" } } } } }) }));
  expect(() => JSON.stringify(targets)).not.toThrow();
});
