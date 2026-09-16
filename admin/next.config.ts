import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // srcディレクトリは自動的に認識されます

  // next dev は AI エージェントを検知すると AGENTS.md / CLAUDE.md をアプリ直下に自動生成する。
  // このリポジトリの正本はリポジトリ直下の CLAUDE.md なので、生成を止めて作業ツリーが汚れないようにする。
  agentRules: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
};

export default nextConfig;
