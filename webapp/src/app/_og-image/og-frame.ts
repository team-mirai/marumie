/**
 * シェア用の画像（OGP、1200×630）の外枠。
 * 外周は淡いミント2か所・濃いグリーン2か所のぼかしを重ねたグラデーションで、ぼかしの位置（模様）だけをページごとに変える。
 */

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/** トップの画像（データに依存しない、サイト全体の既定の og:image）。public/ からの URL */
export const TOP_OG_IMAGE_PATH = "/social/og-top.png";

/** 模様の通り数。ページのキーから決まった番号を選ぶ */
const PATTERN_COUNT = 1000;

/**
 * ページのキー（例：`o/team-mirai/2026`）から模様の番号を決める。同じキーなら毎回同じ番号になる。
 * 文字列のハッシュ（FNV-1a）なので、実行環境によらず同じ値になる。
 */
export function ogPatternIndex(key: string): number {
  let hash = 0x811c9dc5;
  for (const c of key) {
    hash ^= c.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash % PATTERN_COUNT;
}

/** 外周の上の位置 t（0〜1、左上から時計回り）を画像の座標にする */
function perimeterPoint(t: number): { x: number; y: number } {
  const q = (((t % 1) + 1) % 1) * 4;
  if (q < 1) return { x: q * OG_WIDTH, y: 0 };
  if (q < 2) return { x: OG_WIDTH, y: (q - 1) * OG_HEIGHT };
  if (q < 3) return { x: (3 - q) * OG_WIDTH, y: OG_HEIGHT };
  return { x: 0, y: (4 - q) * OG_HEIGHT };
}

const BASE = "#9CE2D3";
const LIGHT = "#F0FCF8";
const DEEP = "#3DBBA8";
const DEEP2 = "#2AA693";
/** ぼかしの楕円の半径（横・縦） */
const RX = 560;
const RY = 420;
/** 2つめ以降のぼかしの位置のずれ。番号ごとに少しずつ変え、模様が規則的に見えないようにする */
const JITTER = [0, 0.07, -0.05, 0.11, -0.09, 0.04];

interface Blob {
  t: number;
  color: string;
  /** 色が消えきる位置（半径に対する割合） */
  fade: number;
}

/** 番号ごとのぼかしの位置と色。下に敷くものから順に並べる */
export function ogPatternBlobs(index: number): Blob[] {
  const t0 = (index * 0.2764 + 0.09) % 1;
  const j = JITTER[index % JITTER.length];
  return [
    { t: t0 + 0.75 - j / 2, color: DEEP, fade: 0.7 },
    { t: t0 + 0.25 + j / 2, color: DEEP2, fade: 0.7 },
    { t: t0 + 0.5 + j, color: LIGHT, fade: 0.72 },
    { t: t0, color: LIGHT, fade: 0.72 },
  ];
}

/** 外周のグラデーションを描いた SVG（画像全体の大きさ） */
export function buildOgBackgroundSvg(index: number): string {
  const blobs = ogPatternBlobs(index);
  const defs = blobs
    .map((blob, i) => {
      const { x, y } = perimeterPoint(blob.t);
      const r = (n: number) => n.toFixed(1);
      // 楕円は円を縦に縮めて作る（userSpaceOnUse の円に、中心を固定した縦の縮小をかける）
      return `<radialGradient id="b${i}" gradientUnits="userSpaceOnUse" cx="${r(x)}" cy="${r(y)}" r="${RX}" gradientTransform="translate(0 ${r(y)}) scale(1 ${RY / RX}) translate(0 ${r(-y)})"><stop offset="0" stop-color="${blob.color}"/><stop offset="${blob.fade}" stop-color="${blob.color}" stop-opacity="0"/></radialGradient>`;
    })
    .join("");
  const layers = blobs
    .map((_, i) => `<rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="url(#b${i})"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}" viewBox="0 0 ${OG_WIDTH} ${OG_HEIGHT}"><defs>${defs}</defs><rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="${BASE}"/>${layers}</svg>`;
}

/** SVG の文字列を img の src に渡せる data URI にする */
export function svgDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
