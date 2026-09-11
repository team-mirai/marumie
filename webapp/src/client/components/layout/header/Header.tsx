import "server-only";
import HeaderClient from "@/client/components/layout/header/HeaderClient";
import { loadOrganizations } from "@/server/contexts/public-finance/presentation/loaders/load-organizations";
import type { ResearchFundPoliticianEntry } from "@/server/contexts/research-fund/domain/models/research-fund-politician-list";
import { loadResearchFundPoliticians } from "@/server/contexts/research-fund/presentation/loaders/load-research-fund-politicians";

/** 組織セレクタに出す年度。`OrganizationYearSheet` の `AVAILABLE_YEARS` と揃える。 */
const AVAILABLE_YEARS = [2025, 2026] as const;

export default async function Header() {
  const [organizationsData, politicianLists] = await Promise.all([
    loadOrganizations(),
    // 年度を切り替えたときに、その年度に帳簿のある議員だけを出せるよう年度ごとに取る。
    Promise.all(
      AVAILABLE_YEARS.map((financialYear) =>
        // 調研費の帳簿が無い環境（CI のビルド時など）でもヘッダーは描けるようにする。
        loadResearchFundPoliticians({ financialYear }).catch((error) => {
          console.error("loadResearchFundPoliticians error:", error);
          return [] as ResearchFundPoliticianEntry[];
        }),
      ),
    ),
  ]);

  const politiciansByYear: Record<number, ResearchFundPoliticianEntry[]> = Object.fromEntries(
    AVAILABLE_YEARS.map((year, index) => [year, politicianLists[index]]),
  );

  return <HeaderClient organizations={organizationsData} politiciansByYear={politiciansByYear} />;
}
