import { readFile } from "fs/promises";
import { join } from "path";
import { PDFDocument } from "pdf-lib";
import {
  detectionMaxEdge,
  fillRegions,
  MAX_MASKING_PAGES,
  MaskingPageLimitError,
  ReceiptMaskingService,
  toPageRegions,
} from "@/server/contexts/research-fund/application/services/receipt-masking-service";
import type { RasterImage } from "@/server/contexts/research-fund/domain/models/masking-region";
import type { DocumentRasterCodec } from "@/server/contexts/research-fund/domain/repositories/document-raster-codec.interface";
import type { PersonalInfoRegionDetector } from "@/server/contexts/research-fund/domain/repositories/personal-info-region-detector.interface";
import { PdfiumDocumentRasterCodec } from "@/server/contexts/research-fund/infrastructure/raster/pdfium-document-raster-codec";

const DATA_DIR = join(process.cwd(), "tests/data/research-fund");

function white(width: number, height: number): RasterImage {
  return { width, height, rgba: new Uint8Array(width * height * 4).fill(255) };
}

/** PDF の全ページを画像にする */
async function renderAll(codec: DocumentRasterCodec, bytes: Uint8Array): Promise<RasterImage[]> {
  const document = await codec.open({ bytes, mime: "application/pdf" });
  try {
    const pages: RasterImage[] = [];
    for (let index = 0; index < document.pageCount; index += 1)
      pages.push(await document.renderPage(index));
    return pages;
  } finally {
    document.close();
  }
}

/** 小さい白紙のページだけの PDF を作る */
async function blankPdf(pageCount: number): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  for (let i = 0; i < pageCount; i += 1) pdf.addPage([72, 72]);
  return await pdf.save();
}

function pixel(image: RasterImage, x: number, y: number): number[] {
  const offset = (y * image.width + x) * 4;
  return [...image.rgba.slice(offset, offset + 4)];
}

describe("detectionMaxEdge", () => {
  /** 長辺を edge に縮めたときの画像トークン数（28 × 28 画素で 1 トークン） */
  function tokens(page: { width: number; height: number }, edge: number): number {
    const ratio = Math.min(1, edge / Math.max(page.width, page.height));
    const width = Math.round(page.width * ratio);
    const height = Math.round(page.height * ratio);
    return Math.ceil(width / 28) * Math.ceil(height / 28);
  }

  it("A4 縦のページは、長辺 1568 画素では画像トークン数が上限を超えるので、上限に収まるまで縮める", () => {
    const page = { width: 1240, height: 1754 };
    const edge = detectionMaxEdge(page);

    expect(tokens(page, 1568)).toBeGreaterThan(1568);
    expect(edge).toBeLessThan(1568);
    expect(tokens(page, edge)).toBeLessThanOrEqual(1568);
    expect(tokens(page, edge + 1)).toBeGreaterThan(1568);
  });

  it("細長いページは長辺 1568 画素で止める", () => {
    expect(detectionMaxEdge({ width: 400, height: 3000 })).toBe(1568);
  });

  it("小さいページは縮めない", () => {
    expect(detectionMaxEdge({ width: 600, height: 800 })).toBe(800);
  });
});

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
  it("矩形の範囲だけを黒で塗る（複製を作らず、渡した画像をそのまま塗る）", () => {
    const filled = white(4, 3);
    fillRegions(filled, [{ x: 1, y: 1, width: 2, height: 1 }]);

    expect(pixel(filled, 1, 1)).toEqual([0, 0, 0, 255]);
    expect(pixel(filled, 2, 1)).toEqual([0, 0, 0, 255]);
    expect(pixel(filled, 0, 1)).toEqual([255, 255, 255, 255]);
    expect(pixel(filled, 3, 1)).toEqual([255, 255, 255, 255]);
    expect(pixel(filled, 1, 0)).toEqual([255, 255, 255, 255]);
    expect(pixel(filled, 1, 2)).toEqual([255, 255, 255, 255]);
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
    // 2 ページで 1 箇所ずつ塗った
    expect(result.regionCount).toBe(2);
    expect(calls).toHaveLength(2);
    for (const call of calls) {
      // LLM には長辺 1568 画素以下・画像トークン 1568 以下の JPEG を渡す
      expect(Math.max(call.width, call.height)).toBeLessThanOrEqual(1568);
      expect(Math.ceil(call.width / 28) * Math.ceil(call.height / 28)).toBeLessThanOrEqual(1568);
      expect([...call.jpeg.slice(0, 2)]).toEqual([0xff, 0xd8]);
    }
    const pages = await renderAll(codec, result.bytes);
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

    expect(await renderAll(codec, result.bytes)).toHaveLength(1);
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

  it(`${MAX_MASKING_PAGES + 1} ページ以上の PDF は、LLM を呼ばずにページ数の上限を超えたエラーで失敗する`, async () => {
    const detect = jest.fn().mockResolvedValue([]);

    const result = new ReceiptMaskingService(codec, { detect }).mask({
      bytes: await blankPdf(MAX_MASKING_PAGES + 1),
      mime: "application/pdf",
    });

    await expect(result).rejects.toThrow(MaskingPageLimitError);
    await expect(result).rejects.toThrow("Document has 21 pages, exceeding the masking limit of 20 pages");
    expect(detect).not.toHaveBeenCalled();
  }, RASTER_TIMEOUT_MS);

  it(`${MAX_MASKING_PAGES} ページちょうどの PDF は黒塗りできる`, async () => {
    const detect = jest.fn().mockResolvedValue([]);

    const result = await new ReceiptMaskingService(codec, { detect }).mask({
      bytes: await blankPdf(MAX_MASKING_PAGES),
      mime: "application/pdf",
    });

    expect(detect).toHaveBeenCalledTimes(MAX_MASKING_PAGES);
    expect(await renderAll(codec, result.bytes)).toHaveLength(MAX_MASKING_PAGES);
  }, RASTER_TIMEOUT_MS);
});

describe("ReceiptMaskingService（ページ画像の持ち方）", () => {
  /**
   * 描画したページ画像が PDF に追加されるまでの間を「保持中」として数える偽のコーデック。
   * 縮小版は保持中のページから作るので、保持中のページ数が 1 以下なら同時に持つ未圧縮の画像は 1 ページ分とその縮小版に収まる
   */
  function trackingCodec(pageCount: number) {
    const state = { rendered: 0, added: 0, maxHeld: 0, closed: false, saved: false };
    const codec: DocumentRasterCodec = {
      open: async () => ({
        pageCount,
        renderPage: async () => {
          state.rendered += 1;
          state.maxHeld = Math.max(state.maxHeld, state.rendered - state.added);
          return white(300, 400);
        },
        close: () => {
          state.closed = true;
        },
      }),
      shrink: (image, maxEdge) => (Math.max(image.width, image.height) <= maxEdge ? image : white(30, 40)),
      toJpeg: () => new Uint8Array([0xff, 0xd8]),
      createImagePdf: async () => ({
        addPage: async () => {
          state.added += 1;
        },
        save: async () => {
          state.saved = true;
          return new Uint8Array();
        },
      }),
    };
    return { codec, state };
  }

  it.each([1, 5, MAX_MASKING_PAGES])(
    "%i ページの書類でも、ページ画像は PDF に追加してから次のページを描画する（同時に保持するのは 1 ページ分）",
    async (pageCount) => {
      const { codec, state } = trackingCodec(pageCount);

      await new ReceiptMaskingService(codec, { detect: async () => [] }).mask({
        bytes: new Uint8Array(),
        mime: "application/pdf",
      });

      expect(state).toEqual({ rendered: pageCount, added: pageCount, maxHeld: 1, closed: true, saved: true });
    },
  );

  it("ページ数が上限を超えるときは、ページを 1 枚も描画せずに書類を閉じる", async () => {
    const { codec, state } = trackingCodec(MAX_MASKING_PAGES + 1);

    await expect(
      new ReceiptMaskingService(codec, { detect: async () => [] }).mask({
        bytes: new Uint8Array(),
        mime: "application/pdf",
      }),
    ).rejects.toThrow(MaskingPageLimitError);

    expect(state).toMatchObject({ rendered: 0, closed: true, saved: false });
  });

  it("途中のページで失敗しても書類を閉じる", async () => {
    const { codec, state } = trackingCodec(3);
    const detect = jest.fn().mockResolvedValueOnce([]).mockRejectedValueOnce(new Error("rate limited"));

    await expect(
      new ReceiptMaskingService(codec, { detect }).mask({ bytes: new Uint8Array(), mime: "application/pdf" }),
    ).rejects.toThrow("Failed to detect personal info on page 2: rate limited");

    expect(state).toMatchObject({ rendered: 2, added: 1, closed: true, saved: false });
  });
});
