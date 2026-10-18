import { readFile } from "fs/promises";
import { join } from "path";
import { PDFiumLibrary } from "@hyzyla/pdfium";
import type { RasterImage } from "@/server/contexts/research-fund/domain/models/masking-region";
import { PdfiumDocumentRasterCodec } from "@/server/contexts/research-fund/infrastructure/raster/pdfium-document-raster-codec";

const DATA_DIR = join(process.cwd(), "tests/data/research-fund");
const codec = new PdfiumDocumentRasterCodec();

/** 単色の画像を作る */
function solid(width: number, height: number, [r, g, b]: [number, number, number]): RasterImage {
  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0; i < rgba.length; i += 4) rgba.set([r, g, b, 255], i);
  return { width, height, rgba };
}

/** PDF の各ページのテキストとページ数を pdfium で読む */
async function readPdf(bytes: Uint8Array): Promise<{ pageCount: number; texts: string[] }> {
  const library = await PDFiumLibrary.init();
  const document = await library.loadDocument(bytes);
  const texts = [...document.pages()].map((page) => page.getText());
  const pageCount = document.getPageCount();
  document.destroy();
  library.destroy();
  return { pageCount, texts };
}

describe("PdfiumDocumentRasterCodec", () => {
  it("PDF は全ページを 150dpi の画像にする", async () => {
    const bytes = new Uint8Array(await readFile(join(DATA_DIR, "masking-dummy-receipts.pdf")));
    const pages = await codec.toPageImages({ bytes, mime: "application/pdf" });

    expect(pages).toHaveLength(2);
    for (const page of pages) {
      // A4（595 × 842 pt）を 150dpi で描画した大きさ
      expect(page.width).toBeCloseTo((595 * 150) / 72, -1);
      expect(page.height).toBeCloseTo((842 * 150) / 72, -1);
      expect(page.rgba).toHaveLength(page.width * page.height * 4);
    }
    // 白背景に文字が描かれている（真っ白でも真っ黒でもない）
    const darkPixels = pages[0].rgba.filter((value, i) => i % 4 === 0 && value < 128).length;
    expect(darkPixels).toBeGreaterThan(0);
    expect(darkPixels).toBeLessThan(pages[0].width * pages[0].height * 0.5);
  });

  it("PNG は 1 ページの画像にする", async () => {
    const bytes = new Uint8Array(await readFile(join(DATA_DIR, "amazon-receipt-01.png")));
    const pages = await codec.toPageImages({ bytes, mime: "image/png" });

    expect(pages).toHaveLength(1);
    expect(pages[0].rgba).toHaveLength(pages[0].width * pages[0].height * 4);
  });

  it("JPEG は 1 ページの画像にし、長辺 2400 画素を超える写真は縮める", async () => {
    const bytes = codec.toJpeg(solid(3000, 1500, [200, 50, 50]));
    const [page] = await codec.toPageImages({ bytes, mime: "image/jpeg" });

    expect({ width: page.width, height: page.height }).toEqual({ width: 2400, height: 1200 });
    // JPEG の圧縮で多少ずれても色は保たれる
    expect(page.rgba[0]).toBeGreaterThan(180);
    expect(page.rgba[1]).toBeLessThan(80);
  });

  it("透過のある PNG は白い背景に重ねる", async () => {
    const { PNG } = await import("pngjs");
    const png = new PNG({ width: 2, height: 1 });
    png.data.set([0, 0, 0, 0, 0, 0, 0, 255]);
    const [page] = await codec.toPageImages({
      bytes: new Uint8Array(PNG.sync.write(png)),
      mime: "image/png",
    });

    expect([...page.rgba]).toEqual([255, 255, 255, 255, 0, 0, 0, 255]);
  });

  describe("shrink", () => {
    it("長辺が上限以下ならそのまま返す", () => {
      const image = solid(100, 50, [0, 0, 0]);
      expect(codec.shrink(image, 100)).toBe(image);
    });

    it("縦横比を保って縮め、色は範囲の平均になる", () => {
      // 左半分が白、右半分が黒の 4 × 2 画像を 2 × 1 に縮める
      const image = solid(4, 2, [255, 255, 255]);
      for (const x of [2, 3]) for (const y of [0, 1]) image.rgba.set([0, 0, 0, 255], (y * 4 + x) * 4);

      const shrunk = codec.shrink(image, 2);

      expect({ width: shrunk.width, height: shrunk.height }).toEqual({ width: 2, height: 1 });
      expect([...shrunk.rgba]).toEqual([255, 255, 255, 255, 0, 0, 0, 255]);
    });
  });

  describe("toImagePdf", () => {
    it("ページ画像だけで構成された PDF を作り、テキスト・メタデータは持たない", async () => {
      const pdf = await codec.toImagePdf([solid(300, 600, [255, 255, 255]), solid(600, 300, [0, 0, 0])]);
      const { pageCount, texts } = await readPdf(pdf);

      expect(pageCount).toBe(2);
      expect(texts).toEqual(["", ""]);
      const raw = Buffer.from(pdf).toString("latin1");
      for (const key of ["/Producer", "/Creator", "/CreationDate", "/Title", "/Annots", "/Font"])
        expect(raw).not.toContain(key);
    });

    it("PDF を画像にしてから組み直すと、ページ数は同じでテキストは残らない", async () => {
      const bytes = new Uint8Array(await readFile(join(DATA_DIR, "masking-dummy-receipts.pdf")));
      expect((await readPdf(bytes)).texts[0]).toContain("090-9876-5432");

      const pages = await codec.toPageImages({ bytes, mime: "application/pdf" });
      const { pageCount, texts } = await readPdf(await codec.toImagePdf(pages));

      expect(pageCount).toBe(2);
      expect(texts).toEqual(["", ""]);
    });
  });
});
