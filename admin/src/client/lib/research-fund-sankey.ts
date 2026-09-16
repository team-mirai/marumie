import type { ResearchFundCategoryTotal } from "@/shared/research-fund/aggregation";

/**
 * viewBox 座標系（デザインハンドオフのプロトタイプ 560x216 のうち、図そのものの描画域だけ）。
 * 末端のラベルは SVG の外に HTML で置くので、ラベル用の余白は viewBox に含めない
 * （SVG は幅 100% で描くため、ラベルを SVG に入れると画面幅に応じて文字まで拡大されてしまう）。
 */
const NODE = { width: 12, leftX: 30, rightX: 400, gap: 4 } as const;
const BODY = { top: 8, height: 160 } as const;
const VIEW = { width: NODE.rightX + NODE.width, height: BODY.top + BODY.height } as const;

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
  /** ラベルの縦中心。描画域の高さに対する % なので、SVG の拡大率に依らず HTML 側で使える */
  labelTopPercent: number;
}

interface ResearchFundSankeyLayout {
  viewBox: string;
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
      labelTopPercent: ((y + height / 2) / VIEW.height) * 100,
    };
  });

  return {
    viewBox: `0 0 ${VIEW.width} ${VIEW.height}`,
    grantNode: { x: NODE.leftX, y: BODY.top, width: NODE.width, height: BODY.height },
    grantLabelLeftPercent: (NODE.leftX / VIEW.width) * 100,
    bands,
  };
}
