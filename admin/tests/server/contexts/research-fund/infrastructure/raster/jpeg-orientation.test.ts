import type { RasterImage } from "@/server/contexts/research-fund/domain/models/masking-region";
import {
  applyOrientation,
  readJpegOrientation,
} from "@/server/contexts/research-fund/infrastructure/raster/jpeg-orientation";
import { PdfiumDocumentRasterCodec } from "@/server/contexts/research-fund/infrastructure/raster/pdfium-document-raster-codec";

const codec = new PdfiumDocumentRasterCodec();

type Rgb = [number, number, number];
const RED: Rgb = [255, 0, 0];
const GREEN: Rgb = [0, 255, 0];
const BLUE: Rgb = [0, 0, 255];
const WHITE: Rgb = [255, 255, 255];

/** 左上・右上・左下・右下を別の色で塗った画像 */
function quadrants(width: number, height: number, [tl, tr, bl, br]: Rgb[]): RasterImage {
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      const color = y < height / 2 ? (x < width / 2 ? tl : tr) : x < width / 2 ? bl : br;
      rgba.set([...color, 255], (y * width + x) * 4);
    }
  return { width, height, rgba };
}

/** 各象限の中心の色（JPEG の圧縮誤差を丸めるため 0 か 255 に寄せる） */
function quadrantColors(image: RasterImage): Rgb[] {
  const points = [
    [0.25, 0.25],
    [0.75, 0.25],
    [0.25, 0.75],
    [0.75, 0.75],
  ];
  return points.map(([px, py]) => {
    const offset = (Math.floor(image.height * py) * image.width + Math.floor(image.width * px)) * 4;
    return [0, 1, 2].map((c) => (image.rgba[offset + c] >= 128 ? 255 : 0)) as Rgb;
  });
}

/** IFD0 に Orientation だけを持つ EXIF（APP1）を作る */
function exifSegment(orientation: number, littleEndian: boolean): Uint8Array {
  const tiff = new DataView(new ArrayBuffer(26));
  tiff.setUint16(0, littleEndian ? 0x4949 : 0x4d4d);
  tiff.setUint16(2, 0x002a, littleEndian);
  tiff.setUint32(4, 8, littleEndian);
  tiff.setUint16(8, 1, littleEndian);
  tiff.setUint16(10, 0x0112, littleEndian);
  tiff.setUint16(12, 3, littleEndian);
  tiff.setUint32(14, 1, littleEndian);
  tiff.setUint16(18, orientation, littleEndian);
  tiff.setUint32(22, 0, littleEndian);
  const body = new Uint8Array([...Buffer.from("Exif\0\0", "latin1"), ...new Uint8Array(tiff.buffer)]);
  const length = body.length + 2;
  return new Uint8Array([0xff, 0xe1, length >> 8, length & 0xff, ...body]);
}

/** SOI の直後に APP1 を差し込む */
function withSegment(jpegBytes: Uint8Array, segment: Uint8Array): Uint8Array {
  return new Uint8Array([...jpegBytes.subarray(0, 2), ...segment, ...jpegBytes.subarray(2)]);
}

describe("readJpegOrientation", () => {
  const jpegBytes = codec.toJpeg(quadrants(8, 8, [RED, GREEN, BLUE, WHITE]));

  it.each([
    [6, false],
    [3, true],
    [8, true],
  ])("Orientation %i を読む（リトルエンディアン: %s）", (orientation, littleEndian) => {
    expect(readJpegOrientation(withSegment(jpegBytes, exifSegment(orientation, littleEndian)))).toBe(
      orientation,
    );
  });

  it("EXIF が無ければ 1", () => {
    expect(readJpegOrientation(jpegBytes)).toBe(1);
  });

  it("壊れた EXIF・範囲外の値・JPEG でないデータは 1", () => {
    const truncated = exifSegment(6, false).subarray(0, 16);
    expect(readJpegOrientation(withSegment(jpegBytes, truncated).subarray(0, 2 + 16))).toBe(1);
    expect(readJpegOrientation(withSegment(jpegBytes, exifSegment(9, false)))).toBe(1);
    expect(readJpegOrientation(new Uint8Array([0x89, 0x50]))).toBe(1);
    expect(readJpegOrientation(new Uint8Array())).toBe(1);
  });
});

describe("applyOrientation", () => {
  // 3 × 2 の画像の画素に 0〜5 の番号を振り、R 成分に入れる
  //   0 1 2
  //   3 4 5
  const image: RasterImage = {
    width: 3,
    height: 2,
    rgba: new Uint8Array([0, 1, 2, 3, 4, 5].flatMap((n) => [n, 0, 0, 255])),
  };
  const layout = (result: RasterImage) => ({
    width: result.width,
    height: result.height,
    pixels: [...result.rgba].filter((_, i) => i % 4 === 0),
  });

  it.each([
    [1, 3, 2, [0, 1, 2, 3, 4, 5]],
    [2, 3, 2, [2, 1, 0, 5, 4, 3]],
    [3, 3, 2, [5, 4, 3, 2, 1, 0]],
    [4, 3, 2, [3, 4, 5, 0, 1, 2]],
    [5, 2, 3, [0, 3, 1, 4, 2, 5]],
    [6, 2, 3, [3, 0, 4, 1, 5, 2]],
    [7, 2, 3, [5, 2, 4, 1, 3, 0]],
    [8, 2, 3, [2, 5, 1, 4, 0, 3]],
  ])("Orientation %i", (orientation, width, height, pixels) => {
    expect(layout(applyOrientation(image, orientation))).toEqual({ width, height, pixels });
  });
});

describe("PdfiumDocumentRasterCodec.toPageImages（EXIF Orientation）", () => {
  // 横長 64 × 32 の画像。左上が赤・右上が緑・左下が青・右下が白
  const jpegBytes = codec.toJpeg(quadrants(64, 32, [RED, GREEN, BLUE, WHITE]));

  it("Orientation 6 の JPEG は時計回りに 90 度回して縦長にする", async () => {
    const [page] = await codec.toPageImages({
      bytes: withSegment(jpegBytes, exifSegment(6, false)),
      mime: "image/jpeg",
    });

    expect({ width: page.width, height: page.height }).toEqual({ width: 32, height: 64 });
    expect(quadrantColors(page)).toEqual([BLUE, RED, WHITE, GREEN]);
  });

  it("Orientation 3 の JPEG は 180 度回す", async () => {
    const [page] = await codec.toPageImages({
      bytes: withSegment(jpegBytes, exifSegment(3, true)),
      mime: "image/jpeg",
    });

    expect({ width: page.width, height: page.height }).toEqual({ width: 64, height: 32 });
    expect(quadrantColors(page)).toEqual([WHITE, BLUE, GREEN, RED]);
  });

  it("Orientation の無い JPEG・壊れた EXIF の JPEG はそのままの向きで読む", async () => {
    const brokenExif = exifSegment(6, false);
    // IFD0 の位置を JPEG の外を指すように書き換える
    brokenExif.set([0xff, 0xff, 0xff, 0xff], 14);
    for (const bytes of [jpegBytes, withSegment(jpegBytes, brokenExif)]) {
      const [page] = await codec.toPageImages({ bytes, mime: "image/jpeg" });
      expect({ width: page.width, height: page.height }).toEqual({ width: 64, height: 32 });
      expect(quadrantColors(page)).toEqual([RED, GREEN, BLUE, WHITE]);
    }
  });
});
