import { readFile } from "fs/promises";
import { join } from "path";
import {
  fillRegions,
  ReceiptMaskingService,
  toPageRegions,
} from "@/server/contexts/research-fund/application/services/receipt-masking-service";
import type { RasterImage } from "@/server/contexts/research-fund/domain/models/masking-region";
import type { PersonalInfoRegionDetector } from "@/server/contexts/research-fund/domain/repositories/personal-info-region-detector.interface";
import { PdfiumDocumentRasterCodec } from "@/server/contexts/research-fund/infrastructure/raster/pdfium-document-raster-codec";

const DATA_DIR = join(process.cwd(), "tests/data/research-fund");

function white(width: number, height: number): RasterImage {
  return { width, height, rgba: new Uint8Array(width * height * 4).fill(255) };
}

function pixel(image: RasterImage, x: number, y: number): number[] {
  const offset = (y * image.width + x) * 4;
  return [...image.rgba.slice(offset, offset + 4)];
}

describe("toPageRegions", () => {
  it("縮小画像の座標を元のページ画像の座標に直し、余白を足す", () => {
    // 1000 × 500 → 2000 × 1000。余白は長辺 2000 の 0.6% = 12 画素
    const regions = toPageRegions(
      [{ x: 100, y: 50, width: 200, height: 20 }],
      { width: 1000, height: 500 },
      { width: 2000, height: 1000 },
    );

    expect(regions).toEqual([{ x: 188, y: 88, width: 424, height: 64 }]);
  });

  it("ページからはみ出す矩形はページ内に収め、幅か高さが無くなるものは捨てる", () => {
    const regions = toPageRegions(
      [
        { x: -10, y: 990, width: 50, height: 100 },
        { x: 2000, y: 0, width: 100, height: 100 },
        { x: 10, y: 10, width: -50, height: 10 },
      ],
      { width: 1000, height: 1000 },
      { width: 1000, height: 1000 },
    );

    // 余白は 6 画素
    expect(regions).toEqual([{ x: 0, y: 984, width: 46, height: 16 }]);
  });
});

describe("fillRegions", () => {
  it("矩形の範囲だけを黒で塗り、元の画像は変えない", () => {
    const image = white(4, 3);
    const filled = fillRegions(image, [{ x: 1, y: 1, width: 2, height: 1 }]);

    expect(pixel(filled, 1, 1)).toEqual([0, 0, 0, 255]);
    expect(pixel(filled, 2, 1)).toEqual([0, 0, 0, 255]);
    expect(pixel(filled, 0, 1)).toEqual([255, 255, 255, 255]);
    expect(pixel(filled, 3, 1)).toEqual([255, 255, 255, 255]);
    expect(pixel(filled, 1, 0)).toEqual([255, 255, 255, 255]);
    expect(pixel(filled, 1, 2)).toEqual([255, 255, 255, 255]);
    expect(pixel(image, 1, 1)).toEqual([255, 255, 255, 255]);
  });
});

describe("ReceiptMaskingService（LLM のみ差し替え）", () => {
  // PDFium で実際にラスタ化するので、CI の並列実行下では既定の 5 秒を超えることがある
  const RASTER_TIMEOUT_MS = 30_000;
  const codec = new PdfiumDocumentRasterCodec();

  it("PDF の全ページで塗る箇所を尋ね、その箇所を塗った同じページ数の PDF を返す", async () => {
    const bytes = new Uint8Array(await readFile(join(DATA_DIR, "masking-dummy-receipts.pdf")));
    const calls: { width: number; height: number; jpeg: Uint8Array }[] = [];
    const detector: PersonalInfoRegionDetector = {
      async detect(page) {
        calls.push(page);
        // 縮小画像の中央の 100 × 100 を塗らせる
        const x = Math.floor(page.width / 2) - 50;
        const y = Math.floor(page.height / 2) - 50;
        return [{ x, y, width: 100, height: 100 }];
      },
    };

    const result = await new ReceiptMaskingService(codec, detector).mask({
      bytes,
      mime: "application/pdf",
    });

    expect(result.mime).toBe("application/pdf");
    expect(calls).toHaveLength(2);
    for (const call of calls) {
      // LLM には長辺 1568 画素以下の JPEG を渡す
      expect(Math.max(call.width, call.height)).toBeLessThanOrEqual(1568);
      expect([...call.jpeg.slice(0, 2)]).toEqual([0xff, 0xd8]);
    }
    const pages = await codec.toPageImages({ bytes: result.bytes, mime: "application/pdf" });
    expect(pages).toHaveLength(2);
    for (const page of pages) {
      const [r, g, b] = pixel(page, Math.floor(page.width / 2), Math.floor(page.height / 2));
      expect(Math.max(r, g, b)).toBeLessThan(30);
      // 塗っていない隅は白いまま
      expect(pixel(page, 5, 5)[0]).toBeGreaterThan(225);
    }
  }, RASTER_TIMEOUT_MS);

  it("画像を渡すと 1 ページの PDF を返す", async () => {
    const bytes = new Uint8Array(await readFile(join(DATA_DIR, "amazon-receipt-01.png")));
    const detector: PersonalInfoRegionDetector = { detect: async () => [] };

    const result = await new ReceiptMaskingService(codec, detector).mask({
      bytes,
      mime: "image/png",
    });

    expect(await codec.toPageImages({ bytes: result.bytes, mime: "application/pdf" })).toHaveLength(1);
  }, RASTER_TIMEOUT_MS);

  it("塗る箇所の判定に失敗したら、黒塗りしないまま返さずに失敗する", async () => {
    const bytes = new Uint8Array(await readFile(join(DATA_DIR, "masking-dummy-receipts.pdf")));
    const detector: PersonalInfoRegionDetector = {
      detect: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockRejectedValueOnce(new Error("rate limited")),
    };

    await expect(
      new ReceiptMaskingService(codec, detector).mask({ bytes, mime: "application/pdf" }),
    ).rejects.toThrow("Failed to detect personal info on page 2: rate limited");
  }, RASTER_TIMEOUT_MS);
});
