import "server-only";
import { PDFiumLibrary } from "@hyzyla/pdfium";
import jpeg from "jpeg-js";
import { PDFDocument } from "pdf-lib";
import { PNG } from "pngjs";
import type {
  MaskableMime,
  RasterImage,
} from "@/server/contexts/research-fund/domain/models/masking-region";
import type { DocumentRasterCodec } from "@/server/contexts/research-fund/domain/repositories/document-raster-codec.interface";
import {
  applyOrientation,
  readJpegOrientation,
} from "@/server/contexts/research-fund/infrastructure/raster/jpeg-orientation";

/** PDF のページを画像にするときの解像度 */
const RENDER_DPI = 150;
/** ページ画像の長辺の上限。スマートフォンで撮った大きな写真もここまで縮める */
const MAX_PAGE_EDGE = 2400;
const JPEG_QUALITY = 85;
/** 展開する PNG の画素数の上限（jpeg-js の既定 maxResolutionInMP と同じ 100 メガピクセル） */
const MAX_PNG_PIXELS = 100_000_000;

/**
 * 書類とページ画像の相互変換。Vercel のサーバーレス関数でも動くよう、
 * ネイティブバイナリや OS のコマンドに依存しないライブラリ（pdfium の WASM 版・pure JS の画像コーデック・pdf-lib）だけを使う。
 */
export class PdfiumDocumentRasterCodec implements DocumentRasterCodec {
  async toPageImages(document: { bytes: Uint8Array; mime: MaskableMime }): Promise<RasterImage[]> {
    if (document.mime === "application/pdf") return await renderPdf(document.bytes);
    const image =
      document.mime === "image/png" ? decodePng(document.bytes) : decodeJpeg(document.bytes);
    return [this.shrink(image, MAX_PAGE_EDGE)];
  }

  shrink(image: RasterImage, maxEdge: number): RasterImage {
    const longEdge = Math.max(image.width, image.height);
    if (longEdge <= maxEdge) return image;
    const ratio = maxEdge / longEdge;
    return resizeByAreaAverage(
      image,
      Math.max(1, Math.round(image.width * ratio)),
      Math.max(1, Math.round(image.height * ratio)),
    );
  }

  toJpeg(image: RasterImage): Uint8Array {
    const encoded = jpeg.encode(
      { data: image.rgba, width: image.width, height: image.height },
      JPEG_QUALITY,
    );
    return new Uint8Array(encoded.data);
  }

  async toImagePdf(pages: RasterImage[]): Promise<Uint8Array> {
    // 作成日時や作成ソフトなどのメタデータも書き込まない
    const pdf = await PDFDocument.create({ updateMetadata: false });
    for (const page of pages) {
      const image = await pdf.embedJpg(this.toJpeg(page));
      const width = (page.width * 72) / RENDER_DPI;
      const height = (page.height * 72) / RENDER_DPI;
      pdf.addPage([width, height]).drawImage(image, { x: 0, y: 0, width, height });
    }
    return await pdf.save();
  }
}

async function renderPdf(bytes: Uint8Array): Promise<RasterImage[]> {
  const library = await PDFiumLibrary.init();
  try {
    const document = await library.loadDocument(bytes);
    try {
      const images: RasterImage[] = [];
      for (const page of document.pages()) {
        const { originalWidth, originalHeight } = page.getOriginalSize();
        const scale = Math.min(
          RENDER_DPI / 72,
          MAX_PAGE_EDGE / Math.max(originalWidth, originalHeight),
        );
        // 既定の描画は白背景・BGRA の順
        const rendered = await page.render({ scale, render: "bitmap" });
        images.push({
          width: rendered.width,
          height: rendered.height,
          rgba: bgraToRgba(rendered.data),
        });
      }
      return images;
    } finally {
      document.destroy();
    }
  } finally {
    library.destroy();
  }
}

function bgraToRgba(bgra: Uint8Array): Uint8Array {
  const rgba = new Uint8Array(bgra.length);
  for (let i = 0; i < bgra.length; i += 4) {
    rgba[i] = bgra[i + 2];
    rgba[i + 1] = bgra[i + 1];
    rgba[i + 2] = bgra[i];
    rgba[i + 3] = 255;
  }
  return rgba;
}

/** EXIF の Orientation に従って、表示上の向きに回転・反転した画像にする */
function decodeJpeg(bytes: Uint8Array): RasterImage {
  const decoded = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true });
  return applyOrientation(
    { width: decoded.width, height: decoded.height, rgba: decoded.data },
    readJpegOrientation(bytes),
  );
}

/** 透過のある PNG は白い背景に重ねる（JPEG にすると透過部分が黒くなるため） */
function decodePng(bytes: Uint8Array): RasterImage {
  // 展開前に IHDR の幅（16〜19 バイト目）と高さ（20〜23 バイト目）を見て、巨大な画像でメモリを使い果たさない
  if (bytes.length < 24) throw new Error("PNG is too short");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(16) * view.getUint32(20) > MAX_PNG_PIXELS)
    throw new Error(`PNG is too large: ${view.getUint32(16)} x ${view.getUint32(20)}`);
  const decoded = PNG.sync.read(Buffer.from(bytes));
  const rgba = new Uint8Array(decoded.data);
  for (let i = 0; i < rgba.length; i += 4) {
    const alpha = rgba[i + 3] / 255;
    for (let c = 0; c < 3; c += 1)
      rgba[i + c] = Math.round(rgba[i + c] * alpha + 255 * (1 - alpha));
    rgba[i + 3] = 255;
  }
  return { width: decoded.width, height: decoded.height, rgba };
}

/** 縮小先の 1 画素に対応する元画像の範囲の平均をとる（縮小専用） */
function resizeByAreaAverage(image: RasterImage, width: number, height: number): RasterImage {
  const rgba = new Uint8Array(width * height * 4);
  const scaleX = image.width / width;
  const scaleY = image.height / height;
  for (let y = 0; y < height; y += 1) {
    const top = Math.floor(y * scaleY);
    const bottom = Math.max(top + 1, Math.floor((y + 1) * scaleY));
    for (let x = 0; x < width; x += 1) {
      const left = Math.floor(x * scaleX);
      const right = Math.max(left + 1, Math.floor((x + 1) * scaleX));
      const sum = [0, 0, 0, 0];
      for (let sy = top; sy < bottom; sy += 1) {
        for (let sx = left; sx < right; sx += 1) {
          const offset = (sy * image.width + sx) * 4;
          for (let c = 0; c < 4; c += 1) sum[c] += image.rgba[offset + c];
        }
      }
      const count = (bottom - top) * (right - left);
      const target = (y * width + x) * 4;
      for (let c = 0; c < 4; c += 1) rgba[target + c] = Math.round(sum[c] / count);
    }
  }
  return { width, height, rgba };
}
