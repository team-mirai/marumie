import type { ICacheInvalidator } from "@/server/contexts/shared/domain/services/cache-invalidator.interface";

/**
 * webapp のキャッシュを HTTP API 経由で無効化する実装
 */
export class WebappCacheInvalidator implements ICacheInvalidator {
  constructor(
    private webappUrl: string = process.env.WEBAPP_URL || "http://localhost:3000",
    private refreshToken: string | undefined = process.env.DATA_REFRESH_TOKEN,
  ) {}

  async invalidateWebappCache(): Promise<void> {
    if (!this.refreshToken) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒タイムアウト

    try {
      const response = await fetch(`${this.webappUrl}/api/refresh`, {
        method: "POST",
        headers: {
          "x-refresh-token": this.refreshToken,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.warn("Failed to refresh webapp cache:", error);
      // キャッシュ更新の失敗は usecase を失敗させない
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
