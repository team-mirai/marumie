import { anthropic } from "@ai-sdk/anthropic";
import { MockLanguageModelV3 } from "ai/test";
import { VercelAIReceiptExtractionGateway } from "@/server/contexts/research-fund/infrastructure/llm/vercel-ai-receipt-extraction-gateway";
import type { ReceiptExtractionParams } from "@/server/contexts/research-fund/domain/repositories/receipt-extraction-gateway.interface";
import { buildReceiptExtractionPrompt } from "@/server/contexts/research-fund/domain/services/receipt-extraction-prompt";

jest.mock("@ai-sdk/anthropic", () => ({ anthropic: jest.fn() }));

const valid = {
  date: "2026-09-10",
  items: [{ item: "書籍", amount: "1,200", category_key: "BOOKS_NEWSPAPERS" }],
};
const params: ReceiptExtractionParams = {
  document: { bytes: new Uint8Array([1, 2, 3]), mime: "image/png" },
  officePrompt: "事務所の読み取り方針",
};
const gateway = new VercelAIReceiptExtractionGateway();

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

describe("VercelAIReceiptExtractionGateway（LLMのみモック、SDKの構造化出力は実行）", () => {
  const originalModel = process.env.RESEARCH_FUND_EXTRACTION_MODEL;
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.RESEARCH_FUND_EXTRACTION_MODEL;
  });
  afterAll(() => {
    if (originalModel === undefined) delete process.env.RESEARCH_FUND_EXTRACTION_MODEL;
    else process.env.RESEARCH_FUND_EXTRACTION_MODEL = originalModel;
  });

  it.each(["image/jpeg", "image/png", "application/pdf"] as const)(
    "%sをSDKへ渡し、構造化出力を正規化する",
    async (mime) => {
      const model = mockOutput(JSON.stringify(valid));
      const result = await gateway.extract({ ...params, document: { ...params.document, mime } });
      expect(result).toEqual({
        status: "valid",
        value: {
          date: valid.date,
          items: [
            {
              item: "書籍",
              amount: 1200,
              category_key: "books-newspapers",
              note: null,
              split_group: null,
            },
          ],
        },
      });
      expect(anthropic).toHaveBeenCalledWith("claude-sonnet-5");
      expect(model.doGenerateCalls).toHaveLength(1);
      const call = model.doGenerateCalls[0];
      expect(call.responseFormat).toMatchObject({ type: "json", schema: { type: "object" } });
      expect(call.prompt).toEqual([
        { role: "system", content: buildReceiptExtractionPrompt(params.officePrompt) },
        {
          role: "user",
          content: [
            expect.objectContaining({ type: "file", mediaType: mime, data: params.document.bytes }),
          ],
        },
      ]);
      expect(call.abortSignal).toBeDefined();
    },
  );

  it("環境変数でモデルを差し替えられる", async () => {
    mockOutput(JSON.stringify(valid));
    process.env.RESEARCH_FUND_EXTRACTION_MODEL = " custom-model ";
    await gateway.extract(params);
    expect(anthropic).toHaveBeenCalledWith("custom-model");
  });

  it.each([
    "not json",
    "{}",
    JSON.stringify({ ...valid, items: [{ ...valid.items[0], category_key: "invented" }] }),
    JSON.stringify({ ...valid, items: [{ ...valid.items[0], amount: "1,20" }] }),
  ])("SDKの出力検証失敗をRFエラーにする", async (text) => {
    mockOutput(text);
    expect(await gateway.extract(params)).toMatchObject({
      status: "invalid",
      errors: [{ code: "RF_INVALID_EXTRACTION_OUTPUT" }],
    });
  });

  it.each([new Error("provider private details"), new DOMException("timeout", "TimeoutError")])(
    "API失敗・タイムアウトはRFエラーとし、再試行や内部情報の公開をしない",
    async (error) => {
      const model = new MockLanguageModelV3({
        doGenerate: async () => {
          throw error;
        },
      });
      jest.mocked(anthropic).mockReturnValue(model);
      const result = await gateway.extract(params);
      expect(result).toMatchObject({
        status: "invalid",
        errors: [{ code: "RF_EXTRACTION_FAILED" }],
      });
      expect(JSON.stringify(result)).not.toContain(error.message);
      expect(model.doGenerateCalls).toHaveLength(1);
    },
  );

  it.each([
    { bytes: new Uint8Array(), mime: "image/png" },
    { bytes: params.document.bytes, mime: "text/plain" },
  ])("空書類・非対応形式はLLMを呼ばず拒否する", async (document) => {
    expect(
      await gateway.extract({
        ...params,
        document: document as ReceiptExtractionParams["document"],
      }),
    ).toMatchObject({ status: "invalid", errors: [{ code: "RF_INVALID_DOCUMENT" }] });
    expect(anthropic).not.toHaveBeenCalled();
  });
});
