import { config } from "dotenv";
import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";

// .env.local から ANTHROPIC_API_KEY を読み込む（admin ディレクトリから実行される前提）
config({ path: join(process.cwd(), ".env.local") });

import { anthropic } from "@ai-sdk/anthropic";
import { PDFiumLibrary } from "@hyzyla/pdfium";
import { generateText } from "ai";
import { ReceiptMaskingService } from "@/server/contexts/research-fund/application/services/receipt-masking-service";
import { VercelAIPersonalInfoRegionDetector } from "@/server/contexts/research-fund/infrastructure/llm/vercel-ai-personal-info-region-detector";
import { PdfiumDocumentRasterCodec } from "@/server/contexts/research-fund/infrastructure/raster/pdfium-document-raster-codec";

/**
 * ダミーの個人情報を載せた 2 ページの PDF を、実際の LLM API で黒塗りし、
 * 出力からテキストを抽出しても LLM に読ませても個人情報が出てこないことを確かめる。
 *
 * テスト用の PDF（tests/data/research-fund/masking-dummy-receipts.pdf）は、HTML を Chromium で PDF にしたもの。
 * 載せている電話番号・住所はすべて架空:
 *   1 ページ目: 文具店の領収書。宛先の議員の住所と携帯電話（塗る）、発行元の文具店の住所と電話（塗らない）
 *   2 ページ目: ホテルの宿泊領収書。発行元のホテルの住所と電話（塗らない）、宿泊者個人の住所と連絡先（塗る）
 *
 * 明示的に有効にしたときだけ動く（ANTHROPIC_API_KEY が要る。DB は使わない）:
 *   pnpm test:integration
 *
 * 黒塗りした PDF は、検証の前に data/integration-output/receipt-masking/masked-dummy-receipts.pdf
 * （リポジトリ直下の data/。gitignore 済み）へ書き出す。どこがどう塗られたかを目で確かめるためのもので、
 * 検証が失敗しても残る。
 */
const describeIntegration = process.env.INTEGRATION_TEST === "true" ? describe : describe.skip;

const FIXTURE = join(process.cwd(), "tests/data/research-fund/masking-dummy-receipts.pdf");
const OUTPUT = join(process.cwd(), "../data/integration-output/receipt-masking/masked-dummy-receipts.pdf");

/** 塗られているべきダミーの個人情報（比較用に空白・ハイフンを除いた形） */
const PERSONAL_INFO = [
  "09098765432",
  "1760099",
  "みどり台9876",
  "コーポ架空",
  "08024681357",
  "2310099",
  "さくら坂54321",
];
/** 塗られずに読めるべき発行元の情報 */
const ISSUER_INFO = ["文具のさくら堂", "ホテル青葉"];

/** 全角・半角の揺れと、空白・ハイフンの有無の揺れをなくす */
function normalize(text: string): string {
  return text.normalize("NFKC").replace(/[\s\-‐‑–—−]/g, "");
}

async function extractText(pdf: Uint8Array): Promise<{ pageCount: number; text: string }> {
  const library = await PDFiumLibrary.init();
  const document = await library.loadDocument(pdf);
  const text = [...document.pages()].map((page) => page.getText()).join("\n");
  const pageCount = document.getPageCount();
  document.destroy();
  library.destroy();
  return { pageCount, text };
}

/** PDF を LLM に読ませ、読み取れる文字をすべて書き出させる */
async function transcribe(pdf: Uint8Array): Promise<string> {
  const { text } = await generateText({
    model: anthropic(process.env.RESEARCH_FUND_MASKING_MODEL?.trim() || "claude-opus-5-5"),
    messages: [
      {
        role: "user",
        content: [
          { type: "file", data: pdf, mediaType: "application/pdf" },
          {
            type: "text",
            text: "この PDF の全ページについて、読み取れる文字をすべてそのまま書き出してください。黒く塗りつぶされて読めない部分は推測せず「■」と書いてください。説明は不要です。",
          },
        ],
      },
    ],
  });
  return text;
}

describeIntegration("ReceiptMaskingService（実際の LLM API）", () => {
  let input: Uint8Array;
  let output: Uint8Array;

  beforeAll(async () => {
    input = new Uint8Array(await readFile(FIXTURE));
    const service = new ReceiptMaskingService(
      new PdfiumDocumentRasterCodec(),
      new VercelAIPersonalInfoRegionDetector(),
    );
    output = (await service.mask({ bytes: input, mime: "application/pdf" })).bytes;
    await mkdir(dirname(OUTPUT), { recursive: true });
    await writeFile(OUTPUT, output);
  }, 300_000);

  it("出力の PDF のページ数は入力と同じ", async () => {
    expect((await extractText(output)).pageCount).toBe((await extractText(input)).pageCount);
  });

  it("入力からはダミーの個人情報を抽出できるが、出力からは抽出できない", async () => {
    const before = normalize((await extractText(input)).text);
    for (const value of PERSONAL_INFO) expect(before).toContain(value);

    const after = normalize((await extractText(output)).text);
    for (const value of PERSONAL_INFO) expect(after).not.toContain(value);
  });

  it("出力を LLM に読ませても、ダミーの電話番号・住所は読み取れず、発行元の店名は読み取れる", async () => {
    const text = normalize(await transcribe(output));

    for (const value of PERSONAL_INFO) expect({ value, found: text.includes(value) }).toEqual({ value, found: false });
    for (const value of ISSUER_INFO) expect({ value, found: text.includes(value) }).toEqual({ value, found: true });
  }, 180_000);
});
