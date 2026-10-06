import "server-only";
import type { ICacheInvalidator } from "@/server/contexts/shared/domain/services/cache-invalidator.interface";

/**
 * 公開ページに出る内容を変えたら webapp のキャッシュを消す。
 * 保存自体は確定しているので、キャッシュ無効化の失敗は失敗にせず警告として返す。
 * research-fund でキャッシュを無効化する usecase はすべてこの関数を通し、警告の扱いを 1 か所にそろえる。
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
