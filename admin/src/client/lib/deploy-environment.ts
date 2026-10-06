/**
 * デプロイ先の環境（本番 / ステージング / PR Preview / ローカル）の判定。
 *
 * ステージングは Vercel の**カスタム環境 `staging`** で運用している。カスタム環境では
 * `VERCEL_ENV` が PR の Preview と同じ `"preview"` になるため、`VERCEL_ENV` ではステージングを
 * 特定できない。カスタム環境名が入る `VERCEL_TARGET_ENV` を見る。
 *
 * `VERCEL_TARGET_ENV` はサーバーにしか無いので、`admin/next.config.ts` が
 * `NEXT_PUBLIC_DEPLOY_TARGET_ENV` としてビルド時に埋め込み、クライアントからも読めるようにしている。
 */

/** ページタイトル（ブラウザタブの表示）の基本形。環境によらずこの文字列を含める。 */
const BASE_PAGE_TITLE = "まる見え政治資金 - 管理画面";

/** ステージングに割り当てている Vercel のカスタム環境名。 */
const STAGING_TARGET_ENV = "staging";

/** 実行中のデプロイ先の環境名（`VERCEL_TARGET_ENV` の写し）。未設定なら `undefined`。 */
export const DEPLOY_TARGET_ENV = process.env.NEXT_PUBLIC_DEPLOY_TARGET_ENV || undefined;

/**
 * ステージング環境かどうかを判定する。
 *
 * **明示的にステージングと判定できたときだけ true** にする（未設定・不明な値は false）。
 * ステージング表示を出し損なうより、本番に警告的な表示を出してしまう方が困るため、
 * 判定できない場合は本番と同じ扱いに倒す。
 */
export function isStagingTargetEnv(targetEnv: string | undefined): boolean {
  return targetEnv === STAGING_TARGET_ENV;
}

/**
 * 環境に応じたページタイトルを組み立てる。
 * ステージングだけ `[stg]` を前置して、本番のタブと取り違えないようにする。
 */
export function buildAdminPageTitle(targetEnv: string | undefined): string {
  return isStagingTargetEnv(targetEnv) ? `[stg] ${BASE_PAGE_TITLE}` : BASE_PAGE_TITLE;
}
