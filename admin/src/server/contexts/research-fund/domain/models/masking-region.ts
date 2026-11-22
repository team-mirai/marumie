/** 書類のページ画像（RGBA。1 画素 4 バイト、左上から行順） */
export interface RasterImage {
  width: number;
  height: number;
  rgba: Uint8Array;
}

/** ページ画像上の塗りつぶす矩形（画素単位。左上が原点） */
export interface MaskingRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}
