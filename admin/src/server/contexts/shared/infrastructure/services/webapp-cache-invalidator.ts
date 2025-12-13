import type { ICacheInvalidator } from "@/server/contexts/shared/domain/services/cache-invalidator.interface";

/**
 * webapp のキャッシュを HTTP API 経由で無効化する実装
 */
export class WebappCacheInvalidator implements ICacheInvalidator {
  constructor(
    private webappUrl: string = process.env.WEBAPP_URL ||
      "http://localhost:3000",
    private refreshToken: string | undefined = process.env.DATA_REFRESH_TOKEN,
  ) {}

  async invalidateWebappCache(): Promise<void> {
    try {
      if (!this.refreshToken) {
        return;
      }

      await fetch(`${this.webappUrl}/api/refresh`, {
        method: "POST",
        headers: {
          "x-refresh-token": this.refreshToken,
        },
      });
    } catch (error) {
      console.warn("Failed to refresh webapp cache:", error);
      // キャッシュ更新の失敗は usecase を失敗させない
    }
  }
}
