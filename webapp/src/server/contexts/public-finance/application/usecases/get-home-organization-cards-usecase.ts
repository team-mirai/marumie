import "server-only";

import type { SankeyData } from "@/server/contexts/shared/domain/models/sankey-data";
import { OrganizationKind } from "@/server/contexts/public-finance/domain/models/organization-kind";
import type { IPoliticalOrganizationRepository } from "@/server/contexts/public-finance/domain/repositories/political-organization-repository.interface";
import type { ITransactionRepository } from "@/server/contexts/public-finance/domain/repositories/transaction-repository.interface";
import type { GetSankeyAggregationUsecase } from "@/server/contexts/public-finance/application/usecases/get-sankey-aggregation-usecase";

interface HomeOrganizationCardYear {
  year: number;
  /** 法律上の区分の収支の流れ。取得に失敗したときは null */
  political: SankeyData | null;
  /** 詳細の区分の収支の流れ。取得に失敗したときは null */
  friendly: SankeyData | null;
}

interface HomeOrganizationCard {
  slug: string;
  displayName: string;
  /** 正式名。未登録なら null */
  orgName: string | null;
  /** 代表者の顔写真を配信できるか（登録済みで、ストレージが使える環境） */
  hasPhoto: boolean;
  years: HomeOrganizationCardYear[];
}

interface GetHomeOrganizationCardsParams {
  years: readonly number[];
  /** 顔写真のストレージが使える環境か */
  photoStorageAvailable: boolean;
}

interface GetHomeOrganizationCardsResult {
  parties: HomeOrganizationCard[];
  groups: HomeOrganizationCard[];
  lastUpdatedAt: string | null;
}

/** トップページの政党・政治団体の収支カードに出す、団体ごと・年ごとの収支の流れを集める。 */
export class GetHomeOrganizationCardsUsecase {
  constructor(
    private politicalOrganizationRepository: IPoliticalOrganizationRepository,
    private transactionRepository: ITransactionRepository,
    private sankeyAggregationUsecase: GetSankeyAggregationUsecase,
  ) {}

  async execute(params: GetHomeOrganizationCardsParams): Promise<GetHomeOrganizationCardsResult> {
    const [organizations, lastUpdatedAt] = await Promise.all([
      this.politicalOrganizationRepository.findAll(),
      this.transactionRepository.getLastUpdatedAt(),
    ]);
    const typeCodesById = await this.politicalOrganizationRepository.findTypeCodesByIds(
      organizations.map((org) => org.id),
    );

    const parties: HomeOrganizationCard[] = [];
    const groups: HomeOrganizationCard[] = [];
    // データベースへの同時接続数を抑えるため、団体・年ごとに順に集計する
    for (const org of organizations) {
      const years: HomeOrganizationCardYear[] = [];
      for (const year of params.years) {
        const [political, friendly] = await Promise.all([
          this.loadSankey(org.slug, year, "political-category"),
          this.loadSankey(org.slug, year, "friendly-category"),
        ]);
        years.push({ year, political, friendly });
      }

      const card: HomeOrganizationCard = {
        slug: org.slug,
        displayName: org.displayName,
        orgName: org.orgName,
        hasPhoto: params.photoStorageAvailable && org.photoPath !== null,
        years,
      };
      const kind = OrganizationKind.fromTypeCodes(typeCodesById.get(org.id) ?? []);
      (kind === "party" ? parties : groups).push(card);
    }

    return { parties, groups, lastUpdatedAt: lastUpdatedAt?.toISOString() ?? null };
  }

  /** 1つの図の取得に失敗しても、ほかのカードは出せるようにする */
  private async loadSankey(
    slug: string,
    financialYear: number,
    categoryType: "political-category" | "friendly-category",
  ): Promise<SankeyData | null> {
    try {
      const { sankeyData } = await this.sankeyAggregationUsecase.execute({
        slugs: [slug],
        financialYear,
        categoryType,
      });
      return sankeyData;
    } catch (error) {
      console.error(`Failed to load sankey data (${slug}, ${financialYear}):`, error);
      return null;
    }
  }
}
