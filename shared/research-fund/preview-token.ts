import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * 調研費を「公開しない」議員のページのプレビュー用の文字列。
 *
 * 秘密の環境変数 RESEARCH_FUND_PREVIEW_SECRET を鍵にした slug の HMAC から作る。
 * リポジトリは OSS なので導出方法は誰でも読めるが、鍵が無ければ作れない。
 * admin（URL を表示する側）と webapp（照合する側）が同じ環境変数から同じ文字列を得るので、DB には保存しない。
 * 鍵を変えると全議員のプレビュー URL が一斉に変わる（議員ごとの失効はしない）。
 */

/** 同じ鍵を他の用途に使っても文字列が一致しないよう、用途名を前置する */
const PREVIEW_TOKEN_PURPOSE = "research-fund-preview";

/** 16 進 32 文字（128 bit）。preview-path.ts の形と揃える */
const PREVIEW_TOKEN_LENGTH = 32;

/** 環境変数の鍵を読む。未設定・空なら null（プレビュー URL は作れず、照合も常に失敗する） */
export function readResearchFundPreviewSecret(
  env: Record<string, string | undefined> = process.env,
): string | null {
  return env.RESEARCH_FUND_PREVIEW_SECRET || null;
}

export function deriveResearchFundPreviewToken(secret: string, slug: string): string {
  return createHmac("sha256", secret)
    .update(`${PREVIEW_TOKEN_PURPOSE}:${slug}`)
    .digest("hex")
    .slice(0, PREVIEW_TOKEN_LENGTH);
}

/** プレビュー用の文字列が slug に対して正しいか。鍵が無ければ常に false。比較はタイミング差の出ない方法で行う。 */
export function verifyResearchFundPreviewToken(
  secret: string | null,
  slug: string,
  previewToken: string,
): boolean {
  if (!secret) return false;
  const expected = Buffer.from(deriveResearchFundPreviewToken(secret, slug));
  const actual = Buffer.from(previewToken);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
