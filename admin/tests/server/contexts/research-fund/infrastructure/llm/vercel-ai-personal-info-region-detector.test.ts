import { anthropic } from "@ai-sdk/anthropic";
import { MockLanguageModelV3 } from "ai/test";
import { buildPersonalInfoMaskingPrompt } from "@/server/contexts/research-fund/domain/services/personal-info-masking-prompt";
import { VercelAIPersonalInfoRegionDetector } from "@/server/contexts/research-fund/infrastructure/llm/vercel-ai-personal-info-region-detector";

jest.mock("@ai-sdk/anthropic", () => ({ anthropic: jest.fn() }));

const page = { jpeg: new Uint8Array([0xff, 0xd8, 1]), width: 800, height: 1200 };
const detector = new VercelAIPersonalInfoRegionDetector();

function mockOutput(text: string) {
  const model = new MockLanguageModelV3({
    doGenerate: {
      content: [{ type: "text", text }],
      finishReason: { unified: "stop", raw: "end_turn" },
      usage: {
        inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: 1, text: 1, reasoning: 0 },
      },
      warnings: [],
    },
  });
  jest.mocked(anthropic).mockReturnValue(model);
  return model;
}

describe("VercelAIPersonalInfoRegionDetector（LLM のみモック、SDK の構造化出力は実行）", () => {
  const originalModel = process.env.RESEARCH_FUND_MASKING_MODEL;
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.RESEARCH_FUND_MASKING_MODEL;
  });
  afterAll(() => {
    if (originalModel === undefined) delete process.env.RESEARCH_FUND_MASKING_MODEL;
    else process.env.RESEARCH_FUND_MASKING_MODEL = originalModel;
  });

  it("画像の大きさを伝えたプロンプトと画像を渡し、返った矩形を返す", async () => {
    const model = mockOutput(
      JSON.stringify({
        regions: [{ label: "議員の電話番号", x: 10, y: 20, width: 300, height: 24 }],
      }),
    );

    const regions = await detector.detect(page);

    expect(regions).toEqual([{ x: 10, y: 20, width: 300, height: 24 }]);
    expect(anthropic).toHaveBeenCalledWith("claude-opus-5-5");
    const [call] = model.doGenerateCalls;
    expect(call.prompt[0]).toEqual({
      role: "system",
      content: buildPersonalInfoMaskingPrompt(800, 1200),
    });
    expect(call.prompt[1]).toMatchObject({
      role: "user",
      content: [{ type: "file", mediaType: "image/jpeg" }],
    });
  });

  it("RESEARCH_FUND_MASKING_MODEL でモデルを差し替えられる", async () => {
    process.env.RESEARCH_FUND_MASKING_MODEL = "claude-sonnet-5";
    mockOutput(JSON.stringify({ regions: [] }));

    expect(await detector.detect(page)).toEqual([]);
    expect(anthropic).toHaveBeenCalledWith("claude-sonnet-5");
  });

  it("構造化出力にならない応答は失敗にする（塗る箇所が分からないまま進めない）", async () => {
    mockOutput("個人情報は見当たりません");

    await expect(detector.detect(page)).rejects.toThrow();
  });
});
