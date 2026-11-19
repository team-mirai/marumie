import { config } from "@/proxy";

/** Next.js が matcher 文字列を正規表現へ変換するのと同じ形でアンカーする。 */
const toRegExp = (matcher: string) => new RegExp(`^${matcher}$`);

/**
 * proxy (middleware) の matcher は Basic 認証とメンテナンスモードのゲート。
 *
 * 過去に否定先読み `.*\.(?:svg|png|...)$` がパス名全体へ適用されており、
 * `/o/<slug>/2026.png` のような動的ルートが Basic 認証・メンテナンスモードを
 * 素通りできる状態だった（CLAUDE-SECURITY-RESULTS.md F3）。
 * 拡張子ベースの除外を復活させるとこのテストが落ちる。
 */
describe("proxy matcher", () => {
  const matchers = config.matcher.map(toRegExp);
  const runsProxy = (pathname: string) => matchers.some((re) => re.test(pathname));

  describe("ゲートを通す（proxy が実行される）", () => {
    const guardedPaths = ["/", "/o/team-mirai", "/o/team-mirai/2026"];

    it.each(guardedPaths)("%s", (pathname) => {
      expect(runsProxy(pathname)).toBe(true);
    });
  });

  describe("拡張子を付けた動的ルートもゲートを通す（F3 リグレッション）", () => {
    const bypassAttempts = [
      "/o/team-mirai/2026.png",
      "/o/team-mirai/2026.jpg",
      "/o/team-mirai/2026.jpeg",
      "/o/team-mirai/2026.svg",
      "/o/team-mirai/2026.gif",
      "/o/team-mirai/2026.webp",
      "/o/team-mirai.png",
    ];

    it.each(bypassAttempts)("%s", (pathname) => {
      expect(runsProxy(pathname)).toBe(true);
    });
  });

  describe("静的アセットのプレフィックスのみ除外される", () => {
    const excludedPaths = ["/_next/static/chunks/main.js", "/_next/image", "/favicon.ico"];

    it.each(excludedPaths)("%s", (pathname) => {
      expect(runsProxy(pathname)).toBe(false);
    });
  });
});
