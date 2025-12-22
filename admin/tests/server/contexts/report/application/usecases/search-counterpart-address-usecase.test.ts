import { SearchCounterpartAddressUsecase } from "@/server/contexts/report/application/usecases/search-counterpart-address-usecase";
import type { ILLMGateway } from "@/server/contexts/report/infrastructure/llm/llm-gateway.interface";
import type { CounterpartAddressSearchResult } from "@/server/contexts/report/domain/models/address-search";

describe("SearchCounterpartAddressUsecase", () => {
  const createMockSearchResult = (
    overrides?: Partial<CounterpartAddressSearchResult>,
  ): CounterpartAddressSearchResult => ({
    candidates: [
      {
        companyName: "株式会社テスト",
        postalCode: "100-0001",
        address: "東京都千代田区千代田1-1",
        confidence: "high",
        source: "公式サイト",
      },
    ],
    searchQuery: "株式会社テスト",
    ...overrides,
  });

  const createMockGateway = (): jest.Mocked<ILLMGateway> => ({
    searchCounterpartAddress: jest.fn(),
  });

  it("検索結果がある場合、成功レスポンスを返す", async () => {
    const mockGateway = createMockGateway();
    const expectedResult = createMockSearchResult();
    mockGateway.searchCounterpartAddress.mockResolvedValue(expectedResult);

    const usecase = new SearchCounterpartAddressUsecase(mockGateway);
    const result = await usecase.execute({ name: "株式会社テスト" });

    expect(mockGateway.searchCounterpartAddress).toHaveBeenCalledWith({
      name: "株式会社テスト",
      hint: undefined,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.candidates).toHaveLength(1);
      expect(result.data.candidates[0].companyName).toBe("株式会社テスト");
    }
  });

  it("ヒント付きで検索できる", async () => {
    const mockGateway = createMockGateway();
    const expectedResult = createMockSearchResult();
    mockGateway.searchCounterpartAddress.mockResolvedValue(expectedResult);

    const usecase = new SearchCounterpartAddressUsecase(mockGateway);
    const result = await usecase.execute({
      name: "株式会社テスト",
      hint: "印刷業",
    });

    expect(mockGateway.searchCounterpartAddress).toHaveBeenCalledWith({
      name: "株式会社テスト",
      hint: "印刷業",
    });
    expect(result.success).toBe(true);
  });

  it("候補が0件の場合、NO_RESULTSエラーを返す", async () => {
    const mockGateway = createMockGateway();
    const emptyResult = createMockSearchResult({ candidates: [] });
    mockGateway.searchCounterpartAddress.mockResolvedValue(emptyResult);

    const usecase = new SearchCounterpartAddressUsecase(mockGateway);
    const result = await usecase.execute({ name: "存在しない会社" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe("NO_RESULTS");
      expect(result.error.message).toContain("存在しない会社");
    }
  });

  it("LLMゲートウェイがエラーを投げた場合、SEARCH_FAILEDエラーを返す", async () => {
    const mockGateway = createMockGateway();
    mockGateway.searchCounterpartAddress.mockRejectedValue(
      new Error("API connection failed"),
    );

    const usecase = new SearchCounterpartAddressUsecase(mockGateway);
    const result = await usecase.execute({ name: "株式会社テスト" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe("SEARCH_FAILED");
      expect(result.error.message).toContain("API connection failed");
    }
  });

  it("非Errorオブジェクトがスローされた場合、デフォルトメッセージを返す", async () => {
    const mockGateway = createMockGateway();
    mockGateway.searchCounterpartAddress.mockRejectedValue("unknown error");

    const usecase = new SearchCounterpartAddressUsecase(mockGateway);
    const result = await usecase.execute({ name: "株式会社テスト" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe("SEARCH_FAILED");
      expect(result.error.message).toContain("予期しないエラーが発生しました");
    }
  });

  it("複数の候補がある場合、すべて返す", async () => {
    const mockGateway = createMockGateway();
    const multipleResults = createMockSearchResult({
      candidates: [
        {
          companyName: "株式会社テスト 本社",
          postalCode: "100-0001",
          address: "東京都千代田区千代田1-1",
          confidence: "high",
          source: "公式サイト",
        },
        {
          companyName: "株式会社テスト 大阪支店",
          postalCode: "530-0001",
          address: "大阪府大阪市北区梅田1-1",
          confidence: "medium",
          source: "法人番号データベース",
        },
        {
          companyName: "株式会社テスト 名古屋支店",
          postalCode: "450-0001",
          address: "愛知県名古屋市中村区名駅1-1",
          confidence: "low",
          source: "LLM知識",
        },
      ],
    });
    mockGateway.searchCounterpartAddress.mockResolvedValue(multipleResults);

    const usecase = new SearchCounterpartAddressUsecase(mockGateway);
    const result = await usecase.execute({ name: "株式会社テスト" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.candidates).toHaveLength(3);
      expect(result.data.candidates[0].confidence).toBe("high");
      expect(result.data.candidates[1].confidence).toBe("medium");
      expect(result.data.candidates[2].confidence).toBe("low");
    }
  });
});
