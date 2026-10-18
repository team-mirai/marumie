import type {
  MaskableMime,
  RasterImage,
} from "@/server/contexts/research-fund/domain/models/masking-region";

/** 書類とページ画像の相互変換 */
export interface DocumentRasterCodec {
  /** 書類をページごとの画像にする（PDF は全ページ、JPEG・PNG は 1 ページ） */
  toPageImages(document: { bytes: Uint8Array; mime: MaskableMime }): Promise<RasterImage[]>;
  /** 長辺が maxEdge 以下になるよう縮小する（すでに収まっていればそのまま返す） */
  shrink(image: RasterImage, maxEdge: number): RasterImage;
  /** LLM に渡すための JPEG にする */
  toJpeg(image: RasterImage): Uint8Array;
  /** ページ画像だけで構成された PDF を作る（テキスト・メタデータ・注釈は持たない） */
  toImagePdf(pages: RasterImage[]): Promise<Uint8Array>;
}
