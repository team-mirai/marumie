import { config } from "@/proxy";

/** Next.js が matcher 文字列を正規表現へ変換するのと同じ形でアンカーする。 */
const toRegExp = (matcher: string) => new RegExp(`^${matcher}$`);

/**
 * proxy (middleware) の matcher は admin アプリ唯一の認証ゲート。
 *
 * 過去に否定先読み `.*\.(?:svg|png|...)$` がパス名全体へ適用されており、
 * `/political-organizations/1.png` のような動的ルートが matcher から外れて
 * 未認証のままサーバーアクションを実行できる状態だった（CLAUDE-SECURITY-RESULTS.md F1）。
 * 拡張子ベースの除外を復活させるとこのテストが落ちる。
 */
describe("proxy matcher", () => {
  const matchers = config.matcher.map(toRegExp);
  const runsProxy = (pathname: string) => matchers.some((re) => re.test(pathname));

  describe("認証ゲートを通す（proxy が実行される）", () => {
    const guardedPaths = [
      "/",
      "/political-organizations",
      "/political-organizations/1",
      "/counterparts/5",
      "/export-report/1/2026",
      "/upload-csv",
      "/users",
    ];

    it.each(guardedPaths)("%s", (pathname) => {
      expect(runsProxy(pathname)).toBe(true);
    });
  });

  describe("拡張子を付けた動的ルートも認証ゲートを通す（F1 リグレッション）", () => {
    const bypassAttempts = [
      "/political-organizations/1.png",
      "/political-organizations/1.jpg",
      "/political-organizations/1.jpeg",
      "/political-organizations/1.svg",
      "/political-organizations/1.gif",
      "/political-organizations/1.webp",
      "/counterparts/5.png",
      "/export-report/1/2026.png",
      "/users.svg",
    ];

    it.each(bypassAttempts)("%s", (pathname) => {
      expect(runsProxy(pathname)).toBe(true);
    });
  });

  describe("静的アセットのプレフィックスのみ除外される", () => {
    const excludedPaths = [
      "/_next/static/chunks/main.js",
      "/_next/image",
      "/favicon.ico",
    ];

    it.each(excludedPaths)("%s", (pathname) => {
      expect(runsProxy(pathname)).toBe(false);
    });
  });
});
