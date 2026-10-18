import { PDFDocument } from "pdf-lib";
import {
  A4_HEIGHT,
  A4_WIDTH,
  buildReceiptPrintPdf,
  CONTENT_BOX,
  placeInBox,
  receiptLabel,
} from "@/client/lib/research-fund-receipt-print";

// 1×1 の PNG
const PNG = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"));

async function pdfWithPages(count: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < count; i++) doc.addPage([A4_WIDTH, A4_HEIGHT]).drawRectangle({ x: 10, y: 10, width: 10, height: 10 });
  return doc.save();
}

describe("placeInBox", () => {
  const box = { x: 10, y: 20, width: 200, height: 400 };
  test("縦横比を保って枠に収め、横は中央・縦は上端に寄せる", () => {
    expect(placeInBox(400, 400, 0, box)).toEqual({ x: 10, y: 220, scale: 0.5, rotate: 0 });
  });
  test("枠より小さい書類は拡大しない", () => {
    expect(placeInBox(100, 100, 0, box)).toEqual({ x: 60, y: 320, scale: 1, rotate: 0 });
  });
  test("90 度回転したページは、回転後の縦横で収め、枠の左下に来るよう原点をずらす", () => {
    // 幅 800 × 高さ 200 のページを 90 度回すと 200 × 800 に見える → scale 0.5 で 100 × 400
    expect(placeInBox(800, 200, 90, box)).toEqual({ x: 60, y: 420, scale: 0.5, rotate: -90 });
    expect(placeInBox(800, 200, 270, box)).toEqual({ x: 160, y: 20, scale: 0.5, rotate: 90 });
    expect(placeInBox(200, 400, 180, box)).toEqual({ x: 210, y: 420, scale: 1, rotate: 180 });
  });
  test("既定の枠は印字の帯より下にあり、A4 に収まる", () => {
    expect(CONTENT_BOX.y + CONTENT_BOX.height).toBeLessThan(A4_HEIGHT - 28 - 14);
    expect(CONTENT_BOX.x + CONTENT_BOX.width).toBeLessThanOrEqual(A4_WIDTH);
  });
});

test("印字は英数字だけで、複数ページなら何ページ目かを入れる", () => {
  expect(receiptLabel(12, 1, 1)).toBe("Receipt No. 12");
  expect(receiptLabel(12, 2, 3)).toBe("Receipt No. 12  (page 2 / 3)");
});

describe("buildReceiptPrintPdf", () => {
  test("画像は 1 ページ、PDF は全ページを並び順のまま A4 縦で入れる", async () => {
    const blank = await PDFDocument.create();
    blank.addPage();
    const files: Record<string, Uint8Array> = { a: PNG, b: await pdfWithPages(3), c: await blank.save() };
    const progress: number[] = [];
    const result = await buildReceiptPrintPdf(
      [{ receiptNumber: 1, mime: "image/png", url: "a" }, { receiptNumber: 2, mime: "application/pdf", url: "b" }, { receiptNumber: 3, mime: "application/pdf", url: "c" }],
      async (url) => files[url],
      (done) => progress.push(done),
    );
    const output = await PDFDocument.load(result.bytes);
    expect(output.getPageCount()).toBe(5);
    for (const page of output.getPages()) {
      expect(page.getSize()).toEqual({ width: A4_WIDTH, height: A4_HEIGHT });
    }
    expect(result.failedReceiptNumbers).toEqual([]);
    expect(progress).toEqual([1, 2, 3]);
  });
  test("取得できない・壊れている・URL の無い書類は、読めなかった旨のページにして番号を返す", async () => {
    const result = await buildReceiptPrintPdf(
      [
        { receiptNumber: 1, mime: "application/pdf", url: "broken" },
        { receiptNumber: 2, mime: "image/png", url: "missing" },
        { receiptNumber: 3, mime: "image/png", url: null },
        { receiptNumber: 4, mime: "image/png", url: "ok" },
      ],
      async (url) => {
        if (url === "missing") throw new Error("404");
        return url === "broken" ? Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x00]) : PNG;
      },
    );
    expect(result.failedReceiptNumbers).toEqual([1, 2, 3]);
    expect((await PDFDocument.load(result.bytes)).getPageCount()).toBe(4);
  });
});
