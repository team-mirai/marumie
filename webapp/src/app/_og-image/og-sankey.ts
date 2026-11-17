import { estimateTextWidth, type SankeyLayout } from "@/client/lib/sankey-layout";
import { OG_HEIGHT, OG_WIDTH } from "@/app/_og-image/og-frame";

/** 図を置く枠（画像の座標） */
export interface OgBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface OgSankeyFitOptions {
  /** 合計の柱の中心を置く横の位置（既定は画像の左右中央） */
  centerX?: number;
  /** 右端の列のラベルの下端の上限。右下のロゴにかからないよう、これより下のラベルは上へ送る */
  labelBottomLimit: number;
  /** 右端の列のラベルを棒から離す幅。離したぶんは細い線で棒とつなぐ */
  labelOffset: number;
  /** 右端の列の棒の右端の上限。右下のロゴより左に棒を置く */
  columnRightLimit?: number;
  /** 図の上端をぼかす範囲（見出しの下に入りこむぶんを消す）。[消えきる位置, 35%の位置, 消え始める位置] */
  fadeTop?: [number, number, number];
}

/** 画像の座標に置き直したラベルの1行 */
export interface OgSankeyText {
  text: string;
  x: number;
  /** 文字の縦の中心 */
  y: number;
  anchor: "start" | "end";
  fontSize: number;
  fontWeight: number;
  fill: string;
  /** 縁を白くする太さ。無ければ縁取りしない */
  halo?: number;
}

export interface OgSankey {
  /** 帯・棒・引き出し線を描いた SVG（画像全体の大きさ） */
  svg: string;
  texts: OgSankeyText[];
}

/** 文字の縦の高さの目安（行の上下の余白を含めない） */
const TEXT_HALF = 0.6;
/** 右端の列のラベルどうしの最小のすき間 */
const LABEL_GAP = 4;
/** 帯の間隔は、文字や棒の縮尺の8割より縮めない（足りなければ図全体を小さくする） */
const MIN_GAP_RATIO = 0.8;
/** 項目が少ない図で帯だけが間延びしないよう、帯の間隔は縮尺の3倍までにする */
const MAX_GAP_RATIO = 3;
const LEADER_COLOR = "#B9C5C0";

interface Interval {
  from: number;
  to: number;
}

/**
 * サイトと同じ形のサンキー図（layoutSankey の結果）を、シェア用の画像の枠に収める。
 * - 文字・棒・縦方向は同じ縮尺で縮め、横方向は棒と棒の間（帯）だけを伸び縮みさせて枠の幅に合わせる
 * - 合計の柱（真ん中の濃いグレーの棒）が centerX に来るよう、左右の帯の伸び方を別々に決める
 * - 右端の列のラベルは棒から離して細い線で引き出し、labelBottomLimit より下に出ないよう上へ送る
 */
export function fitSankeyToBox(
  layout: SankeyLayout,
  box: OgBox,
  options: OgSankeyFitOptions,
): OgSankey {
  const centerX = options.centerX ?? OG_WIDTH / 2;
  const allTexts = layout.labels.flatMap((label) => label.texts);

  // 図の中身の上下左右の端（列の見出し・合計の金額は画像には出さないので含めない）
  const rects = [...layout.nodes, layout.hub];
  const top = Math.min(
    ...rects.map((r) => r.y),
    ...allTexts.map((t) => t.y - t.fontSize * TEXT_HALF),
  );
  const bottom = Math.max(
    ...rects.map((r) => r.y + r.height),
    ...allTexts.map((t) => t.y + t.fontSize * TEXT_HALF),
  );
  const textLeft = (t: (typeof allTexts)[number]) =>
    t.anchor === "end" ? t.x - estimateTextWidth(t.text, t.fontSize) : t.x;
  const textRight = (t: (typeof allTexts)[number]) =>
    t.anchor === "end" ? t.x : t.x + estimateTextWidth(t.text, t.fontSize);
  const minX = Math.min(...rects.map((r) => r.x), ...allTexts.map(textLeft));
  const maxX = Math.max(...rects.map((r) => r.x + r.width), ...allTexts.map(textRight));

  // 棒の列（横の区間）。帯はこの区間のあいだを結ぶ
  const columns = mergeIntervals(rects.map((r) => ({ from: r.x, to: r.x + r.width })));
  const hubCenter = layout.hub.x + layout.hub.width / 2;
  const gaps: (Interval & { left: boolean })[] = [];
  for (let i = 1; i < columns.length; i++) {
    gaps.push({ from: columns[i - 1].to, to: columns[i].from, left: columns[i].from <= hubCenter });
  }
  const gapLength = (left: boolean) =>
    gaps.filter((g) => g.left === left).reduce((sum, g) => sum + (g.to - g.from), 0);
  const gapL = gapLength(true);
  const gapR = gapLength(false);
  // 帯以外（ラベル・棒）の横の長さ。合計の柱の中心で左右に分ける
  const fixedL = hubCenter - minX - gapL;
  const fixedR = maxX - hubCenter - gapR;

  // 右端の列のラベル。下端の上限から上へ積み上げても枠の上端を越えないよう、縮尺の上限に含める
  const rightmost = Math.max(
    ...layout.nodes.filter((n) => n.right).map((n) => n.x),
    Number.NEGATIVE_INFINITY,
  );
  const outerKeys = new Set(
    layout.nodes.filter((n) => n.right && n.x === rightmost).map((n) => n.key),
  );
  const outerLabels = layout.labels.filter((l) => outerKeys.has(l.key) && l.texts.length > 0);
  const outerHeight = outerLabels.reduce(
    (sum, l) =>
      sum +
      Math.max(...l.texts.map((t) => t.y + t.fontSize * TEXT_HALF)) -
      Math.min(...l.texts.map((t) => t.y - t.fontSize * TEXT_HALF)),
    0,
  );
  const outerRoom =
    options.labelBottomLimit - box.y - LABEL_GAP * Math.max(outerLabels.length - 1, 0);

  const left = box.x;
  const right = box.x + box.width;
  const roomL = centerX - left;
  const roomR = right - centerX - options.labelOffset;
  const scale = Math.min(
    box.height / (bottom - top),
    outerHeight > 0 ? outerRoom / outerHeight : Number.POSITIVE_INFINITY,
    roomL / (fixedL + MIN_GAP_RATIO * gapL),
    roomR / (fixedR + MIN_GAP_RATIO * gapR),
  );
  const slopeL =
    gapL > 0 ? Math.min((roomL - scale * fixedL) / gapL, MAX_GAP_RATIO * scale) : scale;
  // 右側は、ラベルまで枠に収まることに加えて、右端の棒の右端を上限より左に置く
  const lastColumn = columns[columns.length - 1].to;
  const barRoom = (options.columnRightLimit ?? Number.POSITIVE_INFINITY) - centerX;
  const slopeR =
    gapR > 0
      ? Math.max(
          0,
          Math.min(
            (roomR - scale * fixedR) / gapR,
            (barRoom - scale * (lastColumn - hubCenter - gapR)) / gapR,
            MAX_GAP_RATIO * scale,
          ),
        )
      : scale;

  // 横の位置の対応。帯の区間だけ傾きを変えた折れ線にする（帯の両端は棒の端に、中ほどの制御点は帯の中にあるので形が崩れない）
  const slopeAt = (x: number) => {
    const gap = gaps.find((g) => x > g.from && x <= g.to);
    if (!gap) return scale;
    return gap.left ? slopeL : slopeR;
  };
  const breaks = [minX, ...gaps.flatMap((g) => [g.from, g.to])].sort((a, b) => a - b);
  const mapX = (x: number) => {
    let out = centerX - scale * (hubCenter - minX - gapL) - slopeL * gapL;
    let cur = minX;
    for (const b of [...breaks.slice(1), Number.POSITIVE_INFINITY]) {
      const end = Math.min(x, b);
      if (end > cur) out += (end - cur) * slopeAt(end);
      cur = Math.max(cur, end);
      if (x <= b) break;
    }
    return out;
  };
  const offsetY = box.y + (box.height - (bottom - top) * scale) / 2;
  const mapY = (y: number) => offsetY + (y - top) * scale;
  const r = (n: number) => Math.round(n * 10) / 10;

  const bandPaths = layout.bands.map((band) => {
    const d = transformPath(band.d, mapX, mapY);
    return `<path d="${d}" fill="${band.color}" fill-opacity="${band.opacity}"/>`;
  });
  const nodeRects = rects.map((n) => {
    const x = mapX(n.x);
    return `<rect x="${r(x)}" y="${r(mapY(n.y))}" width="${r(n.width * scale)}" height="${r(n.height * scale)}" rx="${r(n.rx * scale)}" fill="${n.color}"/>`;
  });

  // ラベル：棒からの距離は文字と同じ縮尺で保つ（帯の伸び縮みに引きずられない）
  const nodeByKey = new Map(layout.nodes.map((n) => [n.key, n]));
  const texts: OgSankeyText[] = [];
  const outer: { node: (typeof layout.nodes)[number]; texts: OgSankeyText[] }[] = [];
  for (const label of layout.labels) {
    const node = nodeByKey.get(label.key);
    if (!node) continue;
    const isOuter = node.right && node.x === rightmost;
    const placed = label.texts.map((t): OgSankeyText => {
      const x =
        t.x <= node.x
          ? mapX(node.x) - (node.x - t.x) * scale
          : mapX(node.x) + node.width * scale + (t.x - node.x - node.width) * scale;
      return {
        text: t.text,
        x: x + (isOuter ? options.labelOffset : 0),
        y: mapY(t.y),
        anchor: t.anchor,
        fontSize: t.fontSize * scale,
        fontWeight: t.fontWeight,
        fill: t.fill,
        ...(t.halo ? { halo: t.halo * scale } : {}),
      };
    });
    texts.push(...placed);
    if (isOuter) outer.push({ node, texts: placed });
  }

  // 右端の列：下端の上限を超えるラベルを、下から順に上へ送る
  const blockTop = (b: OgSankeyText[]) => Math.min(...b.map((t) => t.y - t.fontSize * TEXT_HALF));
  const blockBottom = (b: OgSankeyText[]) =>
    Math.max(...b.map((t) => t.y + t.fontSize * TEXT_HALF));
  let limit = options.labelBottomLimit;
  for (let i = outer.length - 1; i >= 0; i--) {
    const block = outer[i].texts;
    const over = blockBottom(block) - limit;
    if (over > 0) for (const t of block) t.y -= over;
    limit = blockTop(block) - LABEL_GAP;
  }
  const leaders =
    options.labelOffset > 0
      ? outer.map(({ node, texts: block }) => {
          const x1 = mapX(node.x) + node.width * scale + 4;
          const y1 = mapY(node.y + node.height / 2);
          const x2 = block[0].x - 6;
          const y2 = (blockTop(block) + blockBottom(block)) / 2;
          return `<path d="M${r(x1)} ${r(y1)}L${r(x2)} ${r(y2)}" stroke="${LEADER_COLOR}" stroke-width="1.2" fill="none"/>`;
        })
      : [];

  const fade = options.fadeTop;
  const defs = fade
    ? `<defs><linearGradient id="f" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${OG_HEIGHT}"><stop offset="${fade[0] / OG_HEIGHT}" stop-color="#fff" stop-opacity="0"/><stop offset="${fade[1] / OG_HEIGHT}" stop-color="#fff" stop-opacity="0.35"/><stop offset="${fade[2] / OG_HEIGHT}" stop-color="#fff"/></linearGradient><mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="${OG_WIDTH}" height="${OG_HEIGHT}"><rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="url(#f)"/></mask></defs>`
    : "";
  const body = [...bandPaths, ...nodeRects, ...leaders].join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}" viewBox="0 0 ${OG_WIDTH} ${OG_HEIGHT}">${defs}${fade ? `<g mask="url(#m)">${body}</g>` : body}</svg>`;
  return { svg, texts };
}

function mergeIntervals(items: Interval[]): Interval[] {
  const sorted = [...items].sort((a, b) => a.from - b.from);
  const out: Interval[] = [];
  for (const item of sorted) {
    const last = out[out.length - 1];
    if (last && item.from <= last.to) last.to = Math.max(last.to, item.to);
    else out.push({ ...item });
  }
  return out;
}

/** パスの座標（x y の組）を置き直す。コマンドは M・C・L・Z だけを想定する */
function transformPath(
  d: string,
  mapX: (x: number) => number,
  mapY: (y: number) => number,
): string {
  const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];
  const out: string[] = [];
  let pending: number | null = null;
  for (const token of tokens) {
    if (/[A-Za-z]/.test(token)) {
      out.push(token);
      continue;
    }
    const n = Number(token);
    if (pending === null) {
      pending = n;
    } else {
      out.push(
        `${(Math.round(mapX(pending) * 10) / 10).toString()} ${(Math.round(mapY(n) * 10) / 10).toString()}`,
      );
      pending = null;
    }
  }
  return out.join(" ").replace(/ ?([A-Za-z]) ?/g, "$1");
}
