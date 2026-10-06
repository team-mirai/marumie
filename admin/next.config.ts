import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // srcディレクトリは自動的に認識されます

  // next dev は AI エージェントを検知すると AGENTS.md / CLAUDE.md をアプリ直下に自動生成する。
  // このリポジトリの正本はリポジトリ直下の CLAUDE.md なので、生成を止めて作業ツリーが汚れないようにする。
  agentRules: false,

  // Vercel のカスタム環境名（ステージングでは "staging"）をクライアントからも読めるよう、
  // ビルド時にバンドルへ埋め込む。VERCEL_ENV はステージングと PR Preview のどちらも
  // "preview" になるため区別できない（判定は client/lib/deploy-environment.ts）。
  env: {
    NEXT_PUBLIC_DEPLOY_TARGET_ENV: process.env.VERCEL_TARGET_ENV ?? "",
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
};

export default nextConfig;
