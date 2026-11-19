import type { MaskingRegion } from "@/server/contexts/research-fund/domain/models/masking-region";

/** ページ画像から、塗りつぶすべき個人情報の位置を探す */
export interface PersonalInfoRegionDetector {
  /**
   * jpeg は width × height 画素の JPEG。返す矩形はその画像の画素座標。
   * instruction は書類ごとの黒塗りへの追加の指示（無ければ null）
   */
  detect(page: {
    jpeg: Uint8Array;
    width: number;
    height: number;
    instruction: string | null;
  }): Promise<MaskingRegion[]>;
}
