/**
 * GetSankeyAggregationUsecase リグレッションテスト
 *
 * このテストは、Usecaseの入力（リポジトリの戻り値）と出力（SankeyData）を
 * 詳細に検証することで、内部実装のリファクタリング時にも
 * 振る舞いが変わらないことを保証します。
 */
import { GetSankeyAggregationUsecase } from "@/server/contexts/public-finance/application/usecases/get-sankey-aggregation-usecase";
import type {
  ITransactionRepository,
  SankeyCategoryAggregationResult,
} from "@/server/contexts/public-finance/domain/repositories/transaction-repository.interface";
import type { IPoliticalOrganizationRepository } from "@/server/contexts/public-finance/domain/repositories/political-organization-repository.interface";
import type {
  IBalanceSnapshotRepository,
  TotalBalancesByYear,
} from "@/server/contexts/public-finance/domain/repositories/balance-snapshot-repository.interface";
import type { IBalanceSheetRepository } from "@/server/contexts/public-finance/domain/repositories/balance-sheet-repository.interface";

// ヘルパー: ノードをラベルで検索してIDを取得
const getNodeIdByLabel = (
  nodes: Array<{ id: string; label?: string }>,
  label: string,
): string | undefined => nodes.find((n) => n.label === label)?.id;

// ヘルパー: リンクを検索
const findLink = (
  links: Array<{ source: string; target: string; value: number }>,
  sourceId: string | undefined,
  targetId: string | undefined,
) => links.find((link) => link.source === sourceId && link.target === targetId);

describe("GetSankeyAggregationUsecase リグレッションテスト", () => {
  // モックリポジトリの作成
  const createMockRepositories = () => {
    const mockTransactionRepository = {
      getCategoryAggregationForSankey: jest.fn(),
    } as unknown as ITransactionRepository;

    const mockPoliticalOrganizationRepository = {
      findBySlugs: jest.fn(),
    } as unknown as IPoliticalOrganizationRepository;

    const mockBalanceSnapshotRepository = {
      getTotalLatestBalancesByYear: jest.fn(),
    } as unknown as IBalanceSnapshotRepository;

    const mockBalanceSheetRepository = {
      getCurrentLiabilities: jest.fn(),
    } as unknown as IBalanceSheetRepository;

    return {
      mockTransactionRepository,
      mockPoliticalOrganizationRepository,
      mockBalanceSnapshotRepository,
      mockBalanceSheetRepository,
    };
  };

  describe("political-category モード", () => {
    it("サブカテゴリ有りの収入・支出データを正しく変換する", async () => {
      const {
        mockTransactionRepository,
        mockPoliticalOrganizationRepository,
        mockBalanceSnapshotRepository,
        mockBalanceSheetRepository,
      } = createMockRepositories();

      // リポジトリの戻り値を設定
      const mockAggregation: SankeyCategoryAggregationResult = {
        income: [
          { category: "寄附", subcategory: "個人からの寄附", totalAmount: 1000000 },
          { category: "寄附", subcategory: "法人その他の団体からの寄附", totalAmount: 500000 },
          { category: "その他", totalAmount: 200000 },
        ],
        expense: [
          { category: "政治活動費", subcategory: "宣伝費", totalAmount: 800000 },
          { category: "経常経費", subcategory: "人件費", totalAmount: 600000 },
          { category: "経常経費", totalAmount: 300000 },
        ],
      };
      const mockBalances: TotalBalancesByYear = { currentYear: 0, previousYear: 0 };

      (mockPoliticalOrganizationRepository.findBySlugs as jest.Mock).mockResolvedValue([
        { id: "1", slug: "test-org" },
      ]);
      (mockTransactionRepository.getCategoryAggregationForSankey as jest.Mock).mockResolvedValue(
        mockAggregation,
      );
      (mockBalanceSnapshotRepository.getTotalLatestBalancesByYear as jest.Mock).mockResolvedValue(
        mockBalances,
      );
      (mockBalanceSheetRepository.getCurrentLiabilities as jest.Mock).mockResolvedValue(0);

      const usecase = new GetSankeyAggregationUsecase(
        mockTransactionRepository,
        mockPoliticalOrganizationRepository,
        mockBalanceSnapshotRepository,
        mockBalanceSheetRepository,
      );

      const result = await usecase.execute({
        slugs: ["test-org"],
        financialYear: 2025,
        categoryType: "political-category",
      });

      const { nodes, links } = result.sankeyData;

      // ノードの検証
      const nodeLabels = nodes.map((n) => ({ label: n.label, nodeType: n.nodeType }));
      expect(nodeLabels).toEqual(
        expect.arrayContaining([
          { label: "個人からの寄附", nodeType: "income-sub" },
          { label: "法人その他の団体からの寄附", nodeType: "income-sub" },
          { label: "寄附", nodeType: "income" },
          { label: "その他の収入", nodeType: "income" },
          { label: "合計", nodeType: "total" },
          { label: "政治活動費", nodeType: "expense" },
          { label: "経常経費", nodeType: "expense" },
          { label: "宣伝費", nodeType: "expense-sub" },
          { label: "人件費", nodeType: "expense-sub" },
        ]),
      );

      // ノード数の検証（重複なし）
      expect(nodes).toHaveLength(9);

      // リンクの検証
      const individualDonationId = getNodeIdByLabel(nodes, "個人からの寄附");
      const corporateDonationId = getNodeIdByLabel(nodes, "法人その他の団体からの寄附");
      const donationId = getNodeIdByLabel(nodes, "寄附");
      const otherIncomeId = getNodeIdByLabel(nodes, "その他の収入");
      const totalId = getNodeIdByLabel(nodes, "合計");
      const politicalActivityId = getNodeIdByLabel(nodes, "政治活動費");
      const operationalExpenseId = getNodeIdByLabel(nodes, "経常経費");
      const advertisingId = getNodeIdByLabel(nodes, "宣伝費");
      const personnelId = getNodeIdByLabel(nodes, "人件費");

      // 収入サブカテゴリ → 収入カテゴリ
      expect(findLink(links, individualDonationId, donationId)?.value).toBe(1000000);
      expect(findLink(links, corporateDonationId, donationId)?.value).toBe(500000);

      // 収入カテゴリ → 合計
      expect(findLink(links, donationId, totalId)?.value).toBe(1500000);
      expect(findLink(links, otherIncomeId, totalId)?.value).toBe(200000);

      // 合計 → 支出カテゴリ
      expect(findLink(links, totalId, politicalActivityId)?.value).toBe(800000);
      expect(findLink(links, totalId, operationalExpenseId)?.value).toBe(900000);

      // 支出カテゴリ → 支出サブカテゴリ
      expect(findLink(links, politicalActivityId, advertisingId)?.value).toBe(800000);
      expect(findLink(links, operationalExpenseId, personnelId)?.value).toBe(600000);

      // リンク数の検証
      expect(links).toHaveLength(8);
    });

    it("収入 > 支出 の場合、「(仕訳中)」ノードが追加される", async () => {
      const {
        mockTransactionRepository,
        mockPoliticalOrganizationRepository,
        mockBalanceSnapshotRepository,
        mockBalanceSheetRepository,
      } = createMockRepositories();

      const mockAggregation: SankeyCategoryAggregationResult = {
        income: [{ category: "寄附", totalAmount: 2000000 }],
        expense: [{ category: "政治活動費", totalAmount: 1200000 }],
      };
      const mockBalances: TotalBalancesByYear = { currentYear: 0, previousYear: 0 };

      (mockPoliticalOrganizationRepository.findBySlugs as jest.Mock).mockResolvedValue([
        { id: "1", slug: "test-org" },
      ]);
      (mockTransactionRepository.getCategoryAggregationForSankey as jest.Mock).mockResolvedValue(
        mockAggregation,
      );
      (mockBalanceSnapshotRepository.getTotalLatestBalancesByYear as jest.Mock).mockResolvedValue(
        mockBalances,
      );
      (mockBalanceSheetRepository.getCurrentLiabilities as jest.Mock).mockResolvedValue(0);

      const usecase = new GetSankeyAggregationUsecase(
        mockTransactionRepository,
        mockPoliticalOrganizationRepository,
        mockBalanceSnapshotRepository,
        mockBalanceSheetRepository,
      );

      const result = await usecase.execute({
        slugs: ["test-org"],
        financialYear: 2025,
        categoryType: "political-category",
      });

      const { nodes, links } = result.sankeyData;

      // 「(仕訳中)」ノードが存在する
      const processingNode = nodes.find((n) => n.label === "(仕訳中)");
      expect(processingNode).toBeDefined();
      expect(processingNode?.nodeType).toBe("expense");

      // 合計 → (仕訳中) のリンク
      const totalId = getNodeIdByLabel(nodes, "合計");
      const processingId = getNodeIdByLabel(nodes, "(仕訳中)");
      expect(findLink(links, totalId, processingId)?.value).toBe(800000); // 200万 - 120万
    });

    it("収入 <= 支出 の場合、「(仕訳中)」ノードは追加されない", async () => {
      const {
        mockTransactionRepository,
        mockPoliticalOrganizationRepository,
        mockBalanceSnapshotRepository,
        mockBalanceSheetRepository,
      } = createMockRepositories();

      const mockAggregation: SankeyCategoryAggregationResult = {
        income: [{ category: "寄附", totalAmount: 1000000 }],
        expense: [{ category: "政治活動費", totalAmount: 1000000 }],
      };
      const mockBalances: TotalBalancesByYear = { currentYear: 0, previousYear: 0 };

      (mockPoliticalOrganizationRepository.findBySlugs as jest.Mock).mockResolvedValue([
        { id: "1", slug: "test-org" },
      ]);
      (mockTransactionRepository.getCategoryAggregationForSankey as jest.Mock).mockResolvedValue(
        mockAggregation,
      );
      (mockBalanceSnapshotRepository.getTotalLatestBalancesByYear as jest.Mock).mockResolvedValue(
        mockBalances,
      );
      (mockBalanceSheetRepository.getCurrentLiabilities as jest.Mock).mockResolvedValue(0);

      const usecase = new GetSankeyAggregationUsecase(
        mockTransactionRepository,
        mockPoliticalOrganizationRepository,
        mockBalanceSnapshotRepository,
        mockBalanceSheetRepository,
      );

      const result = await usecase.execute({
        slugs: ["test-org"],
        financialYear: 2025,
        categoryType: "political-category",
      });

      const { nodes } = result.sankeyData;

      // 「(仕訳中)」ノードが存在しない
      const processingNode = nodes.find((n) => n.label === "(仕訳中)");
      expect(processingNode).toBeUndefined();
    });

    it("昨年からの現金残高がある場合、収入に追加される", async () => {
      const {
        mockTransactionRepository,
        mockPoliticalOrganizationRepository,
        mockBalanceSnapshotRepository,
        mockBalanceSheetRepository,
      } = createMockRepositories();

      const mockAggregation: SankeyCategoryAggregationResult = {
        income: [{ category: "寄附", totalAmount: 1000000 }],
        expense: [{ category: "政治活動費", totalAmount: 1000000 }],
      };
      const mockBalances: TotalBalancesByYear = { currentYear: 0, previousYear: 150000 };

      (mockPoliticalOrganizationRepository.findBySlugs as jest.Mock).mockResolvedValue([
        { id: "1", slug: "test-org" },
      ]);
      (mockTransactionRepository.getCategoryAggregationForSankey as jest.Mock).mockResolvedValue(
        mockAggregation,
      );
      (mockBalanceSnapshotRepository.getTotalLatestBalancesByYear as jest.Mock).mockResolvedValue(
        mockBalances,
      );
      (mockBalanceSheetRepository.getCurrentLiabilities as jest.Mock).mockResolvedValue(0);

      const usecase = new GetSankeyAggregationUsecase(
        mockTransactionRepository,
        mockPoliticalOrganizationRepository,
        mockBalanceSnapshotRepository,
        mockBalanceSheetRepository,
      );

      const result = await usecase.execute({
        slugs: ["test-org"],
        financialYear: 2025,
        categoryType: "political-category",
      });

      const { nodes, links } = result.sankeyData;

      // 「昨年からの現金残高」ノードが存在する
      const previousBalanceNode = nodes.find((n) => n.label === "昨年からの現金残高");
      expect(previousBalanceNode).toBeDefined();
      expect(previousBalanceNode?.nodeType).toBe("income");

      // 昨年からの現金残高 → 合計 のリンク
      const previousBalanceId = getNodeIdByLabel(nodes, "昨年からの現金残高");
      const totalId = getNodeIdByLabel(nodes, "合計");
      expect(findLink(links, previousBalanceId, totalId)?.value).toBe(150000);
    });

    it("今年の現金残高がある場合、支出に追加される", async () => {
      const {
        mockTransactionRepository,
        mockPoliticalOrganizationRepository,
        mockBalanceSnapshotRepository,
        mockBalanceSheetRepository,
      } = createMockRepositories();

      const mockAggregation: SankeyCategoryAggregationResult = {
        income: [{ category: "寄附", totalAmount: 1000000 }],
        expense: [{ category: "政治活動費", totalAmount: 500000 }],
      };
      const mockBalances: TotalBalancesByYear = { currentYear: 300000, previousYear: 0 };

      (mockPoliticalOrganizationRepository.findBySlugs as jest.Mock).mockResolvedValue([
        { id: "1", slug: "test-org" },
      ]);
      (mockTransactionRepository.getCategoryAggregationForSankey as jest.Mock).mockResolvedValue(
        mockAggregation,
      );
      (mockBalanceSnapshotRepository.getTotalLatestBalancesByYear as jest.Mock).mockResolvedValue(
        mockBalances,
      );
      (mockBalanceSheetRepository.getCurrentLiabilities as jest.Mock).mockResolvedValue(0);

      const usecase = new GetSankeyAggregationUsecase(
        mockTransactionRepository,
        mockPoliticalOrganizationRepository,
        mockBalanceSnapshotRepository,
        mockBalanceSheetRepository,
      );

      const result = await usecase.execute({
        slugs: ["test-org"],
        financialYear: 2025,
        categoryType: "political-category",
      });

      const { nodes, links } = result.sankeyData;

      // 「現金残高」ノードが存在する
      const currentBalanceNode = nodes.find((n) => n.label === "現金残高");
      expect(currentBalanceNode).toBeDefined();
      expect(currentBalanceNode?.nodeType).toBe("expense");

      // 合計 → 現金残高 のリンク
      const totalId = getNodeIdByLabel(nodes, "合計");
      const currentBalanceId = getNodeIdByLabel(nodes, "現金残高");
      expect(findLink(links, totalId, currentBalanceId)?.value).toBe(300000);
    });

    it("今年と昨年の両方の残高がある場合の収支バランス", async () => {
      const {
        mockTransactionRepository,
        mockPoliticalOrganizationRepository,
        mockBalanceSnapshotRepository,
        mockBalanceSheetRepository,
      } = createMockRepositories();

      const mockAggregation: SankeyCategoryAggregationResult = {
        income: [{ category: "寄附", totalAmount: 1000000 }],
        expense: [{ category: "政治活動費", totalAmount: 800000 }],
      };
      const mockBalances: TotalBalancesByYear = { currentYear: 200000, previousYear: 100000 };

      (mockPoliticalOrganizationRepository.findBySlugs as jest.Mock).mockResolvedValue([
        { id: "1", slug: "test-org" },
      ]);
      (mockTransactionRepository.getCategoryAggregationForSankey as jest.Mock).mockResolvedValue(
        mockAggregation,
      );
      (mockBalanceSnapshotRepository.getTotalLatestBalancesByYear as jest.Mock).mockResolvedValue(
        mockBalances,
      );
      (mockBalanceSheetRepository.getCurrentLiabilities as jest.Mock).mockResolvedValue(0);

      const usecase = new GetSankeyAggregationUsecase(
        mockTransactionRepository,
        mockPoliticalOrganizationRepository,
        mockBalanceSnapshotRepository,
        mockBalanceSheetRepository,
      );

      const result = await usecase.execute({
        slugs: ["test-org"],
        financialYear: 2025,
        categoryType: "political-category",
      });

      const { nodes, links } = result.sankeyData;

      const totalId = getNodeIdByLabel(nodes, "合計");
      const previousBalanceId = getNodeIdByLabel(nodes, "昨年からの現金残高");
      const currentBalanceId = getNodeIdByLabel(nodes, "現金残高");
      const processingId = getNodeIdByLabel(nodes, "(仕訳中)");

      // 昨年からの現金残高 → 合計: 10万
      expect(findLink(links, previousBalanceId, totalId)?.value).toBe(100000);

      // 合計 → 現金残高: 20万
      expect(findLink(links, totalId, currentBalanceId)?.value).toBe(200000);

      // 合計 → (仕訳中): 収入110万 - 支出80万 - 現金残高20万 = 10万
      expect(findLink(links, totalId, processingId)?.value).toBe(100000);
    });

    it("空のデータの場合、合計ノードのみ存在する", async () => {
      const {
        mockTransactionRepository,
        mockPoliticalOrganizationRepository,
        mockBalanceSnapshotRepository,
        mockBalanceSheetRepository,
      } = createMockRepositories();

      const mockAggregation: SankeyCategoryAggregationResult = {
        income: [],
        expense: [],
      };
      const mockBalances: TotalBalancesByYear = { currentYear: 0, previousYear: 0 };

      (mockPoliticalOrganizationRepository.findBySlugs as jest.Mock).mockResolvedValue([
        { id: "1", slug: "test-org" },
      ]);
      (mockTransactionRepository.getCategoryAggregationForSankey as jest.Mock).mockResolvedValue(
        mockAggregation,
      );
      (mockBalanceSnapshotRepository.getTotalLatestBalancesByYear as jest.Mock).mockResolvedValue(
        mockBalances,
      );
      (mockBalanceSheetRepository.getCurrentLiabilities as jest.Mock).mockResolvedValue(0);

      const usecase = new GetSankeyAggregationUsecase(
        mockTransactionRepository,
        mockPoliticalOrganizationRepository,
        mockBalanceSnapshotRepository,
        mockBalanceSheetRepository,
      );

      const result = await usecase.execute({
        slugs: ["test-org"],
        financialYear: 2025,
        categoryType: "political-category",
      });

      const { nodes, links } = result.sankeyData;

      expect(nodes).toHaveLength(1);
      expect(nodes[0].label).toBe("合計");
      expect(nodes[0].nodeType).toBe("total");
      expect(links).toHaveLength(0);
    });
  });

  describe("friendly-category モード", () => {
    it("現金残高が未払費用と収支に分離される", async () => {
      const {
        mockTransactionRepository,
        mockPoliticalOrganizationRepository,
        mockBalanceSnapshotRepository,
        mockBalanceSheetRepository,
      } = createMockRepositories();

      const mockAggregation: SankeyCategoryAggregationResult = {
        income: [{ category: "寄附", totalAmount: 500000 }],
        expense: [{ category: "政治活動費", totalAmount: 300000 }],
      };
      const mockBalances: TotalBalancesByYear = { currentYear: 150000, previousYear: 0 };
      const liabilityBalance = 100000;

      (mockPoliticalOrganizationRepository.findBySlugs as jest.Mock).mockResolvedValue([
        { id: "1", slug: "test-org" },
      ]);
      (mockTransactionRepository.getCategoryAggregationForSankey as jest.Mock).mockResolvedValue(
        mockAggregation,
      );
      (mockBalanceSnapshotRepository.getTotalLatestBalancesByYear as jest.Mock).mockResolvedValue(
        mockBalances,
      );
      (mockBalanceSheetRepository.getCurrentLiabilities as jest.Mock).mockResolvedValue(
        liabilityBalance,
      );

      const usecase = new GetSankeyAggregationUsecase(
        mockTransactionRepository,
        mockPoliticalOrganizationRepository,
        mockBalanceSnapshotRepository,
        mockBalanceSheetRepository,
      );

      const result = await usecase.execute({
        slugs: ["test-org"],
        financialYear: 2025,
        categoryType: "friendly-category",
      });

      const { nodes, links } = result.sankeyData;

      // 「現金残高」カテゴリノードが存在する
      const cashBalanceNode = nodes.find((n) => n.label === "現金残高");
      expect(cashBalanceNode).toBeDefined();
      expect(cashBalanceNode?.nodeType).toBe("expense");

      // 「未払費用」サブカテゴリノードが存在する
      const unpaidNode = nodes.find((n) => n.label === "未払費用");
      expect(unpaidNode).toBeDefined();
      expect(unpaidNode?.nodeType).toBe("expense-sub");

      // 「収支」サブカテゴリノードが存在する
      const balanceNode = nodes.find((n) => n.label === "収支");
      expect(balanceNode).toBeDefined();
      expect(balanceNode?.nodeType).toBe("expense-sub");

      // リンクの検証
      const cashBalanceId = getNodeIdByLabel(nodes, "現金残高");
      const unpaidId = getNodeIdByLabel(nodes, "未払費用");
      const balanceId = getNodeIdByLabel(nodes, "収支");

      // 現金残高 → 未払費用: 10万
      expect(findLink(links, cashBalanceId, unpaidId)?.value).toBe(100000);

      // 現金残高 → 収支: 15万 - 10万 = 5万
      expect(findLink(links, cashBalanceId, balanceId)?.value).toBe(50000);
    });

    it("小規模項目が統合される（8個以上のサブカテゴリ）", async () => {
      const {
        mockTransactionRepository,
        mockPoliticalOrganizationRepository,
        mockBalanceSnapshotRepository,
        mockBalanceSheetRepository,
      } = createMockRepositories();

      // 10個のサブカテゴリを持つ収入データ
      const mockAggregation: SankeyCategoryAggregationResult = {
        income: [
          { category: "寄附", subcategory: "大口寄附1", totalAmount: 1000000 },
          { category: "寄附", subcategory: "大口寄附2", totalAmount: 900000 },
          { category: "寄附", subcategory: "大口寄附3", totalAmount: 800000 },
          { category: "寄附", subcategory: "大口寄附4", totalAmount: 700000 },
          { category: "寄附", subcategory: "大口寄附5", totalAmount: 600000 },
          { category: "寄附", subcategory: "大口寄附6", totalAmount: 500000 },
          { category: "寄附", subcategory: "大口寄附7", totalAmount: 400000 },
          { category: "寄附", subcategory: "大口寄附8", totalAmount: 300000 },
          { category: "寄附", subcategory: "小口寄附1", totalAmount: 50000 }, // 統合対象
          { category: "寄附", subcategory: "小口寄附2", totalAmount: 30000 }, // 統合対象
        ],
        expense: [{ category: "政治活動費", totalAmount: 5280000 }],
      };
      const mockBalances: TotalBalancesByYear = { currentYear: 0, previousYear: 0 };

      (mockPoliticalOrganizationRepository.findBySlugs as jest.Mock).mockResolvedValue([
        { id: "1", slug: "test-org" },
      ]);
      (mockTransactionRepository.getCategoryAggregationForSankey as jest.Mock).mockResolvedValue(
        mockAggregation,
      );
      (mockBalanceSnapshotRepository.getTotalLatestBalancesByYear as jest.Mock).mockResolvedValue(
        mockBalances,
      );
      (mockBalanceSheetRepository.getCurrentLiabilities as jest.Mock).mockResolvedValue(0);

      const usecase = new GetSankeyAggregationUsecase(
        mockTransactionRepository,
        mockPoliticalOrganizationRepository,
        mockBalanceSnapshotRepository,
        mockBalanceSheetRepository,
      );

      const result = await usecase.execute({
        slugs: ["test-org"],
        financialYear: 2025,
        categoryType: "friendly-category",
      });

      const { nodes, links } = result.sankeyData;

      // 「その他（寄附）」ノードが存在する（小規模項目が統合された）
      const otherDonationNode = nodes.find((n) => n.label === "その他（寄附）");
      expect(otherDonationNode).toBeDefined();
      expect(otherDonationNode?.nodeType).toBe("income-sub");

      // 「小口寄附1」「小口寄附2」は個別ノードとして存在しない
      const smallDonation1 = nodes.find((n) => n.label === "小口寄附1");
      const smallDonation2 = nodes.find((n) => n.label === "小口寄附2");
      expect(smallDonation1).toBeUndefined();
      expect(smallDonation2).toBeUndefined();

      // 「その他（寄附）」→「寄附」のリンクの値は統合された金額
      const otherDonationId = getNodeIdByLabel(nodes, "その他（寄附）");
      const donationId = getNodeIdByLabel(nodes, "寄附");
      expect(findLink(links, otherDonationId, donationId)?.value).toBe(80000); // 5万 + 3万
    });
  });

  describe("複数組織対応", () => {
    it("複数組織のデータが合算される", async () => {
      const {
        mockTransactionRepository,
        mockPoliticalOrganizationRepository,
        mockBalanceSnapshotRepository,
        mockBalanceSheetRepository,
      } = createMockRepositories();

      const mockAggregation: SankeyCategoryAggregationResult = {
        income: [{ category: "寄附", totalAmount: 3000000 }], // 2組織の合計
        expense: [{ category: "政治活動費", totalAmount: 2000000 }],
      };
      const mockBalances: TotalBalancesByYear = { currentYear: 500000, previousYear: 300000 };

      (mockPoliticalOrganizationRepository.findBySlugs as jest.Mock).mockResolvedValue([
        { id: "1", slug: "org-1" },
        { id: "2", slug: "org-2" },
      ]);
      (mockTransactionRepository.getCategoryAggregationForSankey as jest.Mock).mockResolvedValue(
        mockAggregation,
      );
      (mockBalanceSnapshotRepository.getTotalLatestBalancesByYear as jest.Mock).mockResolvedValue(
        mockBalances,
      );
      (mockBalanceSheetRepository.getCurrentLiabilities as jest.Mock).mockResolvedValue(0);

      const usecase = new GetSankeyAggregationUsecase(
        mockTransactionRepository,
        mockPoliticalOrganizationRepository,
        mockBalanceSnapshotRepository,
        mockBalanceSheetRepository,
      );

      const result = await usecase.execute({
        slugs: ["org-1", "org-2"],
        financialYear: 2025,
      });

      const { nodes, links } = result.sankeyData;

      // リポジトリが正しい引数で呼ばれた
      expect(mockTransactionRepository.getCategoryAggregationForSankey).toHaveBeenCalledWith(
        ["1", "2"],
        2025,
        undefined,
      );

      // 合計金額が正しい
      const donationId = getNodeIdByLabel(nodes, "寄附");
      const totalId = getNodeIdByLabel(nodes, "合計");
      expect(findLink(links, donationId, totalId)?.value).toBe(3000000);
    });
  });

  describe("エラーケース", () => {
    it("組織が見つからない場合はエラーをスロー", async () => {
      const {
        mockTransactionRepository,
        mockPoliticalOrganizationRepository,
        mockBalanceSnapshotRepository,
        mockBalanceSheetRepository,
      } = createMockRepositories();

      (mockPoliticalOrganizationRepository.findBySlugs as jest.Mock).mockResolvedValue([]);

      const usecase = new GetSankeyAggregationUsecase(
        mockTransactionRepository,
        mockPoliticalOrganizationRepository,
        mockBalanceSnapshotRepository,
        mockBalanceSheetRepository,
      );

      await expect(
        usecase.execute({
          slugs: ["non-existent-org"],
          financialYear: 2025,
        }),
      ).rejects.toThrow('Political organizations with slugs "non-existent-org" not found');
    });
  });
});
