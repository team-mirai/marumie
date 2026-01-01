import { SearchCounterpartAddressUsecase } from "@/server/contexts/report/application/usecases/search-counterpart-address-usecase";
import type { LLMGateway } from "@/server/contexts/report/infrastructure/llm/llm-gateway.interface";
import type { CounterpartAddressSearchResult } from "@/server/contexts/report/infrastructure/llm/types";

describe("SearchCounterpartAddressUsecase", () => {
  let mockLLMGateway: jest.Mocked<LLMGateway>;
  let usecase: SearchCounterpartAddressUsecase;

  beforeEach(() => {
    mockLLMGateway = {
      searchAddress: jest.fn(),
    };
    usecase = new SearchCounterpartAddressUsecase(mockLLMGateway);
  });

  describe("住所検索成功", () => {
    it("候補が見つかった場合は成功結果を返す", async () => {
      const searchResult: CounterpartAddressSearchResult = {
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
      };
      mockLLMGateway.searchAddress.mockResolvedValue(searchResult);

      const result = await usecase.execute("株式会社テスト");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.candidates).toHaveLength(1);
        expect(result.data.candidates[0].companyName).toBe("株式会社テスト");
      }
    });

    it("複数の候補が見つかった場合も成功結果を返す", async () => {
      const searchResult: CounterpartAddressSearchResult = {
        candidates: [
          {
            companyName: "株式会社テスト 本社",
            postalCode: "100-0001",
            address: "東京都千代田区千代田1-1",
            confidence: "high",
            source: "公式サイト",
          },
          {
            companyName: "株式会社テスト 支社",
            postalCode: "530-0001",
            address: "大阪府大阪市北区梅田1-1",
            confidence: "medium",
            source: "登記情報",
          },
        ],
        searchQuery: "株式会社テスト",
      };
      mockLLMGateway.searchAddress.mockResolvedValue(searchResult);

      const result = await usecase.execute("株式会社テスト");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.candidates).toHaveLength(2);
      }
    });

    it("ヒントを渡して検索する", async () => {
      const searchResult: CounterpartAddressSearchResult = {
        candidates: [
          {
            companyName: "株式会社テスト",
            postalCode: "100-0001",
            address: "東京都千代田区千代田1-1",
            confidence: "high",
            source: "公式サイト",
          },
        ],
        searchQuery: "株式会社テスト IT企業",
      };
      mockLLMGateway.searchAddress.mockResolvedValue(searchResult);

      await usecase.execute("株式会社テスト", "IT企業");

      expect(mockLLMGateway.searchAddress).toHaveBeenCalledWith({
        companyName: "株式会社テスト",
        hint: "IT企業",
      });
    });
  });

  describe("住所検索失敗", () => {
    it("候補が見つからない場合はNO_RESULTSエラーを返す", async () => {
      const searchResult: CounterpartAddressSearchResult = {
        candidates: [],
        searchQuery: "存在しない会社",
      };
      mockLLMGateway.searchAddress.mockResolvedValue(searchResult);

      const result = await usecase.execute("存在しない会社");

      expect(result.success).toBe(false);
      if (!result.success && result.error.type === "NO_RESULTS") {
        expect(result.error.message).toContain("住所候補が見つかりませんでした");
      }
    });
  });
});
