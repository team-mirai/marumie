import type { ResearchFundCategoryTotal } from "@/shared/research-fund/aggregation";

/**
 * viewBox 座標系（デザインハンドオフのプロトタイプ 560x216 のうち、図そのものの描画域だけ）。
 * 末端のラベルは SVG の外に HTML で置くので、ラベル用の余白は viewBox に含めない
 * （SVG は幅 100% で描くため、ラベルを SVG に入れると画面幅に応じて文字まで拡大されてしまう）。
 */
const NODE = { width: 12, leftX: 30, rightX: 400, gap: 4 } as const;
const BODY = { top: 8, height: 160 } as const;
const VIEW = { width: NODE.rightX + NODE.width, height: BODY.top + BODY.height } as const;

/**
 * 末端ラベル 1 行分の高さ（11px / leading-tight）、行どうしに空けたい余白、図の高さの下限。
 * ラベルの位置は % で返すので、重ならないことを保証するには基準になる高さが要る。
 * 図は幅なりに伸びるが高さには下限があるので、その下限を基準に % を出しておけば、
 * 図がそれより高いときは実寸の間隔がさらに広がる（= どの幅でも重ならない）。
 */
const LABEL = { lineHeight: 14, gap: 2, minHeight: 200 } as const;

/** 費目数ぶんのラベルを 1 行ずつ重ねずに並べられる、図の高さの下限（px） */
function minHeightFor(labelCount: number): number {
  const needed = Math.max(0, labelCount - 1) * (LABEL.lineHeight + LABEL.gap) + LABEL.lineHeight;
  return Math.max(LABEL.minHeight, needed);
}

interface SankeyRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ResearchFundSankeyBand {
  key: string;
  label: string;
  kind: ResearchFundCategoryTotal["kind"];
  /** ラベルに出す実額（未使用は支出超過で負になりうる） */
  amount: number;
  /** 支給から費目へ流れるリボンの path */
  ribbon: string;
  /** 右端のノード */
  node: SankeyRect;
  /**
   * ラベルの縦中心。描画域の高さに対する % なので、SVG の拡大率に依らず HTML 側で使える。
   * 金額の小さい費目が続くとノードの中心どうしが数 px しか離れないため、重ならないよう押し下げてある。
   */
  labelTopPercent: number;
}

interface ResearchFundSankeyLayout {
  viewBox: string;
  /**
   * 図の高さの下限（px）。幅が狭いときにここまでしか縮まないので、
   * labelTopPercent はこの高さでもラベルが重ならないように決めてある。
   */
  minHeight: number;
  /** 左端のノード（支給） */
  grantNode: SankeyRect;
  /** 「支給 ¥…」ラベルの左端。描画域の幅に対する % */
  grantLabelLeftPercent: number;
  bands: ResearchFundSankeyBand[];
}

function ribbon(leftY: number, leftHeight: number, rightY: number, rightHeight: number): string {
  const [x1, x2] = [NODE.leftX + NODE.width, NODE.rightX];
  const [c1, c2] = [x1 + (x2 - x1) * 0.4, x1 + (x2 - x1) * 0.6];
  return [
    `M ${x1} ${leftY}`,
    `C ${c1} ${leftY}, ${c2} ${rightY}, ${x2} ${rightY}`,
    `L ${x2} ${rightY + rightHeight}`,
    `C ${c2} ${rightY + rightHeight}, ${c1} ${leftY + leftHeight}, ${x1} ${leftY + leftHeight}`,
    "Z",
  ].join(" ");
}

/**
 * 昇順に並んだラベルの中心位置を、最小間隔 `minSpacing` を空けつつ `range` の内側に収まるよう押し下げる。
 * 入力の順序はそのまま保つので、ラベルと費目の対応は崩れない。
 * 単位は呼び出し側に委ねる（このファイルでは描画域の高さに対する %）。
 */
export function spreadLabelCenters(
  centers: readonly number[],
  minSpacing: number,
  range: { min: number; max: number },
): number[] {
  const span = range.max - range.min;
  // 最小間隔で詰めても入りきらないときは、等間隔に散らして重なりを最小限にする。
  if (centers.length > 1 && minSpacing * (centers.length - 1) > span) {
    return centers.map((_, index) => range.min + (span * index) / (centers.length - 1));
  }

  const spread = [...centers];
  // 上から順に最小間隔まで押し下げ、下端をはみ出した分を下から順に押し上げて戻す。
  for (let index = 0; index < spread.length; index++) {
    const floor = index === 0 ? range.min : spread[index - 1] + minSpacing;
    spread[index] = Math.max(spread[index], floor);
  }
  for (let index = spread.length - 1; index >= 0; index--) {
    const ceiling = index === spread.length - 1 ? range.max : spread[index + 1] - minSpacing;
    spread[index] = Math.min(spread[index], ceiling);
  }
  return spread;
}

/**
 * 公開の before / after を並べて見せる簡易サンキーの座標を組み立てる。
 * 左ノード = 支給、右ノード = 費目（末尾に未使用）。金額は shared の集計サービスが出したものをそのまま使う。
 * 描くものが無い（支給・支出がまだ無い）場合は null を返す。
 */
export function layoutResearchFundSankey(
  granted: number,
  categories: readonly ResearchFundCategoryTotal[],
): ResearchFundSankeyLayout | null {
  // 支出が支給を超えて未使用が負になる場合も、描画上は 0 として扱う（金額はラベルで示す）。
  const drawn = categories.map((category) => Math.max(0, category.totalAmount));
  const total = drawn.reduce((sum, amount) => sum + amount, 0);
  if (granted <= 0 || total <= 0) return null;

  // 左は隙間なしの1本、右は費目どうしを離して積む。
  const leftScale = BODY.height / total;
  const rightScale = (BODY.height - NODE.gap * Math.max(0, categories.length - 1)) / total;
  let leftOffset = BODY.top;
  let rightOffset = BODY.top;
  const bands = categories.map((category, index) => {
    const [leftHeight, height] = [drawn[index] * leftScale, drawn[index] * rightScale];
    const [leftY, y] = [leftOffset, rightOffset];
    leftOffset += leftHeight;
    rightOffset += height + NODE.gap;
    return {
      key: category.key,
      label: category.label,
      kind: category.kind,
      amount: category.totalAmount,
      ribbon: ribbon(leftY, leftHeight, y, height),
      node: { x: NODE.rightX, y, width: NODE.width, height },
    };
  });
  const minHeight = minHeightFor(bands.length);
  const edgePercent = (LABEL.lineHeight / 2 / minHeight) * 100;
  const labelTops = spreadLabelCenters(
    bands.map((band) => ((band.node.y + band.node.height / 2) / VIEW.height) * 100),
    ((LABEL.lineHeight + LABEL.gap) / minHeight) * 100,
    { min: edgePercent, max: 100 - edgePercent },
  );

  return {
    viewBox: `0 0 ${VIEW.width} ${VIEW.height}`,
    minHeight,
    grantNode: { x: NODE.leftX, y: BODY.top, width: NODE.width, height: BODY.height },
    grantLabelLeftPercent: (NODE.leftX / VIEW.width) * 100,
    bands: bands.map((band, index) => ({ ...band, labelTopPercent: labelTops[index] })),
  };
}
