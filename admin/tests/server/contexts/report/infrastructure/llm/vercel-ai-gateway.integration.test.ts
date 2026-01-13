import { config } from "dotenv";
import { join } from "path";

// .env.local から環境変数を読み込む（admin ディレクトリから実行される前提）
config({ path: join(process.cwd(), ".env.local") });

import { VercelAIGateway } from "@/server/contexts/report/infrastructure/llm/vercel-ai-gateway";

const shouldRunIntegrationTests = process.env.INTEGRATION_TEST === "true";

const describeIntegration = shouldRunIntegrationTests ? describe : describe.skip;

describeIntegration("VercelAIGateway Integration Tests", () => {
  const gateway = new VercelAIGateway();

  it("有名企業の住所を検索できる", async () => {
    // トヨタ自動車は本社所在地が明確で安定している
    const result = await gateway.searchAddress({
      companyName: "トヨタ自動車株式会社",
      hint: "本社",
    });

    expect(result.candidates.length).toBeGreaterThan(0);

    const candidate = result.candidates[0];
    expect(candidate.companyName).toContain("トヨタ");
    expect(candidate.address).toContain("愛知県");
    expect(candidate.address).toContain("豊田");
  }, 60000);
});
