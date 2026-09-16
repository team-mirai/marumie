import type { ICacheInvalidator } from "@/server/contexts/shared/domain/services/cache-invalidator.interface";

/** 開発用に http を許可する loopback ホスト（IPv6 は URL.hostname が角括弧付きで返す） */
const LOOPBACK_HOSTNAMES = ["localhost", "127.0.0.1", "[::1]"];

/**
 * リフレッシュトークンを平文で送らないよう、宛先 URL が https（または開発用 loopback の http）であることを検証する
 */
function assertSecureWebappUrl(webappUrl: string): void {
  let url: URL;
  try {
    url = new URL(webappUrl);
  } catch {
    throw new Error(
      `WEBAPP_URL (${webappUrl}) を URL として解釈できないため、ウェブアプリのキャッシュをクリアできません`,
    );
  }

  if (url.protocol === "https:") {
    return;
  }

  if (url.protocol === "http:" && LOOPBACK_HOSTNAMES.includes(url.hostname)) {
    return;
  }

  throw new Error(
    `WEBAPP_URL (${webappUrl}) が https ではないため、リフレッシュトークンを送信できません。本番環境では https の URL を設定してください`,
  );
}

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
      throw new Error(
        "DATA_REFRESH_TOKEN が設定されていないため、ウェブアプリのキャッシュをクリアできません",
      );
    }

    assertSecureWebappUrl(this.webappUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒タイムアウト

    let response: Response;
    try {
      response = await fetch(`${this.webappUrl}/api/refresh`, {
        method: "POST",
        headers: {
          "x-refresh-token": this.refreshToken,
        },
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`ウェブアプリ (${this.webappUrl}) への接続がタイムアウトしました（5秒）`);
      }
      throw new Error(
        `ウェブアプリ (${this.webappUrl}) への接続に失敗しました: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      const detail = body ? ` ${body}` : "";
      throw new Error(
        `ウェブアプリのキャッシュクリアに失敗しました (HTTP ${response.status}).${detail}`,
      );
    }
  }
}
