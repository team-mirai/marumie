import type {
  MaskableMime,
  RasterImage,
} from "@/server/contexts/research-fund/domain/models/masking-region";

/** 開いた書類。ページを 1 枚ずつ画像にする（全ページの画像を同時に持たないため） */
export interface RasterDocument {
  /** ページ数（PDF はページを描画せずに分かる。JPEG・PNG は 1） */
  readonly pageCount: number;
  /** index（0 始まり）のページを画像にする */
  renderPage(index: number): Promise<RasterImage>;
  /** 書類を閉じてリソースを解放する */
  close(): void;
}

/** ページ画像を 1 枚ずつ追加して、画像だけの PDF を作る */
export interface ImagePdfWriter {
  /** ページを追加する。JPEG にして埋め込むので、渡した画像の画素データは保持しない */
  addPage(image: RasterImage): Promise<void>;
  /** 追加したページで PDF を作る（テキスト・メタデータ・注釈は持たない） */
  save(): Promise<Uint8Array>;
}

/** 書類とページ画像の相互変換 */
export interface DocumentRasterCodec {
  /** 書類を開く。使い終わったら close する */
  open(document: { bytes: Uint8Array; mime: MaskableMime }): Promise<RasterDocument>;
  /** 長辺が maxEdge 以下になるよう縮小する（すでに収まっていればそのまま返す） */
  shrink(image: RasterImage, maxEdge: number): RasterImage;
  /** LLM に渡すための JPEG にする */
  toJpeg(image: RasterImage): Uint8Array;
  /** ページ画像だけで構成された PDF を作り始める */
  createImagePdf(): Promise<ImagePdfWriter>;
}
