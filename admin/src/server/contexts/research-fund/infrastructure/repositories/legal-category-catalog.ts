import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  buildLegalCategoryCatalog,
  type LegalCategoryCatalog,
  legalCategoryOverrideOf,
  type ResearchFundLegalCategory,
} from "@/shared/research-fund/legal-category";

/** 仕訳ごとの法定区分の上書き（#1880）を読み出すときの select */
export const legalCategoryOverrideSelect = {
  select: { legalCategoryKey: true, reason: true },
} satisfies Prisma.ResearchFundLegalCategoryOverrideDefaultArgs;

type OverridableRow = { legalCategoryOverride?: { legalCategoryKey: string } | null };

/**
 * 法定区分の上書きを引き当てる区分の一覧（科目マスタから作る）。
 * 上書きのある仕訳が無ければ科目マスタを読まない（上書きを使わない帳簿の読み出しを導入前と同じにする）。
 */
export async function loadLegalCategoryCatalog(
  prisma: PrismaClient | Prisma.TransactionClient,
  rows: readonly OverridableRow[],
): Promise<LegalCategoryCatalog> {
  if (!rows.some((row) => row.legalCategoryOverride)) return new Map();
  return buildLegalCategoryCatalog(
    await prisma.researchFundAccount.findMany({
      where: { legalCategoryKey: { not: null } },
      select: { legalCategoryKey: true, legalLabel: true },
    }),
  );
}

/** 仕訳の上書きを区分に引き当てる。上書きの無い仕訳は null（科目の既定に従う） */
export function overrideOf(
  row: OverridableRow,
  catalog: LegalCategoryCatalog,
): ResearchFundLegalCategory | null {
  return legalCategoryOverrideOf(row.legalCategoryOverride?.legalCategoryKey, catalog);
}

/** 上書きがあるときだけ集計行に添える。上書きの無い帳簿の集計行は導入前と同じ形のままにする */
export function withOverride(override: ResearchFundLegalCategory | null) {
  return override ? { legalCategoryOverride: override } : {};
}
