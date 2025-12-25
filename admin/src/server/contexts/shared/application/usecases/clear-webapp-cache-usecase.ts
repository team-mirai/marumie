import "server-only";

import type { ICacheInvalidator } from "@/server/contexts/shared/domain/services/cache-invalidator.interface";

export interface ClearWebappCacheResult {
  success: boolean;
  message: string;
}

export class ClearWebappCacheUsecase {
  constructor(private cacheInvalidator: ICacheInvalidator) {}

  async execute(): Promise<ClearWebappCacheResult> {
    try {
      await this.cacheInvalidator.invalidateWebappCache();
      return {
        success: true,
        message: "キャッシュをクリアしました",
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "不明なエラー",
      };
    }
  }
}
