import type { NextConfig } from "next";

// ローカル Supabase Storage の署名 URL は http://127.0.0.1:54331 のような http オリジンで配信されるため、
// `img-src 'self' data: https:` だけでは CSP に弾かれて領収書画像が表示できない。
// 開発時に限りそのオリジンを許可する（本番の署名 URL は https なので追加しない）。
const localHttpOrigin = (url: string | undefined): string | null => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" ? parsed.origin : null;
  } catch {
    return null;
  }
};

const imgSrc = (): string => {
  const directive = "img-src 'self' data: https:";
  if (process.env.NODE_ENV === "production") return directive;
  const origin = localHttpOrigin(process.env.SUPABASE_URL);
  return origin ? `${directive} ${origin}` : directive;
};

const nextConfig: NextConfig = {
  // srcディレクトリは自動的に認識されます

  // next dev は AI エージェントを検知すると AGENTS.md / CLAUDE.md をアプリ直下に自動生成する。
  // このリポジトリの正本はリポジトリ直下の CLAUDE.md なので、生成を止めて作業ツリーが汚れないようにする。
  agentRules: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://va.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline'",
              imgSrc(),
              "font-src 'self'",
              "connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://vitals.vercel-insights.com",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
