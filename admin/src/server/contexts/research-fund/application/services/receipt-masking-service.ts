import "server-only";
import type {
  MaskableMime,
  MaskingRegion,
  RasterImage,
} from "@/server/contexts/research-fund/domain/models/masking-region";
import type { DocumentRasterCodec } from "@/server/contexts/research-fund/domain/repositories/document-raster-codec.interface";
import type { PersonalInfoRegionDetector } from "@/server/contexts/research-fund/domain/repositories/personal-info-region-detector.interface";

/**
 * LLM に渡すページ画像の長辺と画像トークン数（28 × 28 画素で 1 トークン）の上限。
 * どちらかを超えると API 側で縮小され、返る座標がずれる。標準解像度のモデルに切り替えても収まる値にしている
 */
const DETECTION_MAX_EDGE = 1568;
const DETECTION_MAX_TOKENS = 1568;
const DETECTION_PATCH = 28;
/** 黒塗りできる書類のページ数の上限。LLM をページごとに順に呼ぶので、関数の実行時間の上限に収まるようにする */
export const MAX_MASKING_PAGES = 20;
/** 塗る矩形の四辺に足す余白（ページ画像の長辺に対する割合）。LLM の座標の誤差を吸収する */
const PADDING_RATIO = 0.006;

/** 書類のページ数が黒塗りできる上限を超えている */
export class MaskingPageLimitError extends Error {
  constructor(readonly pageCount: number) {
    super(
      `Document has ${pageCount} pages, exceeding the masking limit of ${MAX_MASKING_PAGES} pages`,
    );
  }
}

/**
 * 書類（PDF・JPEG・PNG）の個人情報を黒塗りした PDF を作る。
 * 下の文字が残らないよう、全ページを画像にしてから塗り、画像だけの PDF に組み直す。
 * メモリがページ数に比例しないよう、1 ページずつ描画・塗り・PDF への追加を済ませてから次のページに進む。
 * DB・Storage には触れず、バイト列を受け取って返す。
 */
export class ReceiptMaskingService {
  constructor(
    private readonly codec: DocumentRasterCodec,
    private readonly detector: PersonalInfoRegionDetector,
  ) {}

  /** instruction は書類ごとの黒塗りへの追加の指示（#1867）。全ページの判定に添える */
  async mask(document: {
    bytes: Uint8Array;
    mime: MaskableMime;
    instruction?: string | null;
  }): Promise<{ bytes: Uint8Array; mime: "application/pdf"; regionCount: number }> {
    const source = await this.codec.open(document);
    try {
      // LLM を呼ぶ前に、ページを描画せずに分かるページ数で断る
      if (source.pageCount > MAX_MASKING_PAGES) throw new MaskingPageLimitError(source.pageCount);
      const pdf = await this.codec.createImagePdf();
      let regionCount = 0;
      // ページを順に処理し、LLM への同時リクエストを増やさない
      for (let index = 0; index < source.pageCount; index += 1) {
        const page = await source.renderPage(index);
        regionCount += await this.maskPage(page, index, document.instruction ?? null);
        await pdf.addPage(page);
      }
      return { bytes: await pdf.save(), mime: "application/pdf", regionCount };
    } finally {
      source.close();
    }
  }

  /** ページ画像の個人情報を塗る（渡した画像をそのまま塗る）。塗った箇所の数を返す */
  private async maskPage(
    page: RasterImage,
    index: number,
    instruction: string | null,
  ): Promise<number> {
    const preview = this.codec.shrink(page, detectionMaxEdge(page));
    let regions: MaskingRegion[];
    try {
      regions = await this.detector.detect({
        jpeg: this.codec.toJpeg(preview),
        width: preview.width,
        height: preview.height,
        instruction,
      });
    } catch (error) {
      // 塗る箇所が分からないまま元の書類を返すことはしない
      throw new Error(
        `Failed to detect personal info on page ${index + 1}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    const pageRegions = toPageRegions(regions, preview, page);
    fillRegions(page, pageRegions);
    return pageRegions.length;
  }
}

/**
 * LLM に渡すために縮める長辺を、長辺と画像トークン数の両方の上限に収まるよう決める。
 * 縮めた大きさは shrink と同じ丸め方で求める
 */
export function detectionMaxEdge(page: { width: number; height: number }): number {
  const longEdge = Math.max(page.width, page.height);
  let edge = Math.min(DETECTION_MAX_EDGE, longEdge);
  while (edge > DETECTION_PATCH) {
    const ratio = edge / longEdge;
    const width = Math.max(1, Math.round(page.width * ratio));
    const height = Math.max(1, Math.round(page.height * ratio));
    const tokens = Math.ceil(width / DETECTION_PATCH) * Math.ceil(height / DETECTION_PATCH);
    if (tokens <= DETECTION_MAX_TOKENS) break;
    edge -= 1;
  }
  return edge;
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

/**
 * 画像の矩形の範囲を黒で塗る。ページ 1 枚分の複製を持たないよう、渡した画像をそのまま書き換える。
 * 矩形はページ内に収まっている前提
 */
export function fillRegions(image: RasterImage, regions: MaskingRegion[]): void {
  const { rgba } = image;
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
}
