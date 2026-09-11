import "server-only";
import HeaderClient from "@/client/components/layout/header/HeaderClient";
import { loadOrganizations } from "@/server/contexts/public-finance/presentation/loaders/load-organizations";
import { loadResearchFundPoliticians } from "@/server/contexts/research-fund/presentation/loaders/load-research-fund-politicians";

/** 組織セレクタに出す年度。`AVAILABLE_YEARS` の最新に合わせる。 */
const DEFAULT_YEAR = 2026;

export default async function Header() {
  const [organizationsData, politicians] = await Promise.all([
    loadOrganizations(),
    // 調研費の帳簿が無い環境（CI のビルド時など）でもヘッダーは描けるようにする。
    loadResearchFundPoliticians({ financialYear: DEFAULT_YEAR }).catch((error) => {
      console.error("loadResearchFundPoliticians error:", error);
      return [];
    }),
  ]);

  return <HeaderClient organizations={organizationsData} politicians={politicians} />;
}
