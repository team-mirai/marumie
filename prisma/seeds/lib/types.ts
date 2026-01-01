import type { PrismaClient } from '@prisma/client';

/**
 * シーダーインターフェース
 * 各シーダーはこのインターフェースを実装する
 */
export interface Seeder {
  /** シーダーの表示名 */
  name: string;
  /** シード実行処理 */
  seed(prisma: PrismaClient): Promise<void>;
}
