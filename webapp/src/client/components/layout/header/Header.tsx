import "server-only";
import HeaderClient from "@/client/components/layout/header/HeaderClient";
import { HEADER_YEARS } from "@/client/lib/header-navigation";
import { loadOrganizations } from "@/server/contexts/public-finance/presentation/loaders/load-organizations";
import type { ResearchFundPoliticianEntry } from "@/server/contexts/research-fund/domain/models/research-fund-politician-list";
import { loadResearchFundPoliticians } from "@/server/contexts/research-fund/presentation/loaders/load-research-fund-politicians";

export default async function Header() {
  const [organizationsData, politicianLists] = await Promise.all([
    loadOrganizations(),
    // メニューで議員ごとに公開している年度を出せるよう年度ごとに取る。
    // 調研費を「公開しない」議員は loader が返さないので、メニューに出ない（プレビュー URL で見ているときも）。
    Promise.all(
      HEADER_YEARS.map((financialYear) =>
        // 調研費の帳簿が無い環境（CI のビルド時など）でもヘッダーは描けるようにする。
        loadResearchFundPoliticians({ financialYear }).catch((error) => {
          console.error("loadResearchFundPoliticians error:", error);
          return [] as ResearchFundPoliticianEntry[];
        }),
      ),
    ),
  ]);

  const politiciansByYear: Record<number, ResearchFundPoliticianEntry[]> = Object.fromEntries(
    HEADER_YEARS.map((year, index) => [year, politicianLists[index]]),
  );

  return <HeaderClient organizations={organizationsData} politiciansByYear={politiciansByYear} />;
}
