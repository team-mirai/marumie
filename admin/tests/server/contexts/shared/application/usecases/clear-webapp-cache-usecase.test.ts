import { ClearWebappCacheUsecase } from "@/server/contexts/shared/application/usecases/clear-webapp-cache-usecase";
import type { ICacheInvalidator } from "@/server/contexts/shared/domain/services/cache-invalidator.interface";

describe("ClearWebappCacheUsecase", () => {
  let mockCacheInvalidator: jest.Mocked<ICacheInvalidator>;

  beforeEach(() => {
    mockCacheInvalidator = {
      invalidateWebappCache: jest.fn(),
    };
  });

  it("キャッシュ無効化に成功した場合、成功レスポンスを返す", async () => {
    mockCacheInvalidator.invalidateWebappCache.mockResolvedValue(undefined);

    const usecase = new ClearWebappCacheUsecase(mockCacheInvalidator);
    const result = await usecase.execute();

    expect(result).toEqual({
      success: true,
      message: "キャッシュをクリアしました",
    });
    expect(mockCacheInvalidator.invalidateWebappCache).toHaveBeenCalledTimes(1);
  });

  it("キャッシュ無効化に失敗した場合、エラーレスポンスを返す", async () => {
    mockCacheInvalidator.invalidateWebappCache.mockRejectedValue(
      new Error("Connection failed"),
    );

    const usecase = new ClearWebappCacheUsecase(mockCacheInvalidator);
    const result = await usecase.execute();

    expect(result).toEqual({
      success: false,
      message: "Connection failed",
    });
    expect(mockCacheInvalidator.invalidateWebappCache).toHaveBeenCalledTimes(1);
  });

  it("不明なエラーの場合、デフォルトメッセージを返す", async () => {
    mockCacheInvalidator.invalidateWebappCache.mockRejectedValue("unknown error");

    const usecase = new ClearWebappCacheUsecase(mockCacheInvalidator);
    const result = await usecase.execute();

    expect(result).toEqual({
      success: false,
      message: "不明なエラー",
    });
  });
});
