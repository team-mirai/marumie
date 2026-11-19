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
  // 書類の公開用の版を作る PDFium は、同じディレクトリの pdfium.wasm を実行時に読み込む（#1802）。
  // バンドルするとファイルの場所がずれるので node_modules から読ませ、デプロイ先に wasm を含める。
  serverExternalPackages: ["@hyzyla/pdfium"],
  // 作成はキューと定期実行から呼ばれる Route Handler で行う（#1812）。
  outputFileTracingIncludes: {
    "/politicians/[id]/books/[bookId]/**": ["./node_modules/@hyzyla/pdfium/dist/pdfium.wasm"],
    "/api/queues/document-masking": ["./node_modules/@hyzyla/pdfium/dist/pdfium.wasm"],
    "/api/cron/document-masking": ["./node_modules/@hyzyla/pdfium/dist/pdfium.wasm"],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
};

export default nextConfig;
