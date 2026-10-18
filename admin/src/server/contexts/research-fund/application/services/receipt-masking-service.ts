import "server-only";
import type {
  MaskableMime,
  MaskingRegion,
  RasterImage,
} from "@/server/contexts/research-fund/domain/models/masking-region";
import type { DocumentRasterCodec } from "@/server/contexts/research-fund/domain/repositories/document-raster-codec.interface";
import type { PersonalInfoRegionDetector } from "@/server/contexts/research-fund/domain/repositories/personal-info-region-detector.interface";

/** LLM に渡すページ画像の長辺。これを超えると API 側で縮小され、返る座標がずれる */
const DETECTION_MAX_EDGE = 1568;
/** 塗る矩形の四辺に足す余白（ページ画像の長辺に対する割合）。LLM の座標の誤差を吸収する */
const PADDING_RATIO = 0.006;

/**
 * 書類（PDF・JPEG・PNG）の個人情報を黒塗りした PDF を作る。
 * 下の文字が残らないよう、全ページを画像にしてから塗り、画像だけの PDF に組み直す。
 * DB・Storage には触れず、バイト列を受け取って返す。
 */
export class ReceiptMaskingService {
  constructor(
    private readonly codec: DocumentRasterCodec,
    private readonly detector: PersonalInfoRegionDetector,
  ) {}

  async mask(document: {
    bytes: Uint8Array;
    mime: MaskableMime;
  }): Promise<{ bytes: Uint8Array; mime: "application/pdf" }> {
    const pages = await this.codec.toPageImages(document);
    const masked: RasterImage[] = [];
    // ページを順に処理し、LLM への同時リクエストとメモリ上のページ画像を増やさない
    for (const [index, page] of pages.entries()) {
      const preview = this.codec.shrink(page, DETECTION_MAX_EDGE);
      let regions: MaskingRegion[];
      try {
        regions = await this.detector.detect({
          jpeg: this.codec.toJpeg(preview),
          width: preview.width,
          height: preview.height,
        });
      } catch (error) {
        // 塗る箇所が分からないまま元の書類を返すことはしない
        throw new Error(
          `Failed to detect personal info on page ${index + 1}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      masked.push(fillRegions(page, toPageRegions(regions, preview, page)));
    }
    return { bytes: await this.codec.toImagePdf(masked), mime: "application/pdf" };
  }
}

/**
 * 縮小画像の座標で返った矩形を元のページ画像の座標に直し、余白を足してページ内に収める。
 * 幅・高さが 0 以下になるものは捨てる。
 */
export function toPageRegions(
  regions: MaskingRegion[],
  from: { width: number; height: number },
  to: { width: number; height: number },
): MaskingRegion[] {
  const scaleX = to.width / from.width;
  const scaleY = to.height / from.height;
  const padding = Math.ceil(Math.max(to.width, to.height) * PADDING_RATIO);
  return regions.flatMap((region) => {
    const left = Math.max(0, Math.floor(region.x * scaleX) - padding);
    const top = Math.max(0, Math.floor(region.y * scaleY) - padding);
    const right = Math.min(to.width, Math.ceil((region.x + region.width) * scaleX) + padding);
    const bottom = Math.min(to.height, Math.ceil((region.y + region.height) * scaleY) + padding);
    if (right <= left || bottom <= top) return [];
    return [{ x: left, y: top, width: right - left, height: bottom - top }];
  });
}

/** 矩形の範囲を黒で塗った新しい画像を返す（元の画像は変えない）。矩形はページ内に収まっている前提 */
export function fillRegions(image: RasterImage, regions: MaskingRegion[]): RasterImage {
  const rgba = new Uint8Array(image.rgba);
  for (const region of regions) {
    for (let y = region.y; y < region.y + region.height; y += 1) {
      const rowStart = (y * image.width + region.x) * 4;
      for (let i = 0; i < region.width; i += 1) {
        const offset = rowStart + i * 4;
        rgba[offset] = 0;
        rgba[offset + 1] = 0;
        rgba[offset + 2] = 0;
        rgba[offset + 3] = 255;
      }
    }
  }
  return { width: image.width, height: image.height, rgba };
}
