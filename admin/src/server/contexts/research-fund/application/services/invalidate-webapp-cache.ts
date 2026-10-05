import "server-only";
import type { ICacheInvalidator } from "@/server/contexts/shared/domain/services/cache-invalidator.interface";

/**
 * 用途と活用方針は公開ページにそのまま出るので、保存したら webapp のキャッシュを消す。
 * 保存自体は確定しているので、キャッシュ無効化の失敗は警告として返す（仕訳の公開と同じ扱い）。
 */
export async function invalidateWebappCache(
  cacheInvalidator: ICacheInvalidator,
): Promise<string | null> {
  try {
    await cacheInvalidator.invalidateWebappCache();
    return null;
  } catch (error) {
    return error instanceof Error
      ? error.message
      : "ウェブアプリのキャッシュを更新できませんでした";
  }
}
