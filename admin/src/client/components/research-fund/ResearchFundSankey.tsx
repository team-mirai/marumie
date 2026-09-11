import { cn } from "@/client/lib";
import type { ResearchFundCategoryTotal } from "@/shared/research-fund/aggregation";

// viewBox 座標系（デザインハンドオフのプロトタイプ 560x216 に合わせる）
const VIEW = { width: 560, height: 216 };
const BODY = { top: 8, height: 160 };
const NODE = { width: 12, leftX: 30, rightX: 400, gap: 4 };
const LABEL = { offset: 6, fontSize: 10 };

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

function yen(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

/**
 * 公開の before / after を並べて見せるための簡易サンキー。
 * 左ノード = 支給、右ノード = 費目（末尾に未使用）。金額は shared の集計サービスが出したものをそのまま描く。
 */
export function ResearchFundSankey({
  granted,
  categories,
}: {
  granted: number;
  categories: readonly ResearchFundCategoryTotal[];
}) {
  // 支出が支給を超えて未使用が負になる場合も、描画上は 0 として扱う（金額はラベルで示す）。
  const nodes = categories.map((category) => ({
    ...category,
    drawn: Math.max(0, category.totalAmount),
  }));
  const total = nodes.reduce((sum, node) => sum + node.drawn, 0);
  if (granted <= 0 || total <= 0)
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        公開済みの支給・支出がまだありません
      </p>
    );
  // 左は隙間なしの1本、右は費目どうしを離して積む。
  const leftScale = BODY.height / total;
  const rightScale = (BODY.height - NODE.gap * Math.max(0, nodes.length - 1)) / total;
  let leftOffset = BODY.top;
  let rightOffset = BODY.top;
  const placed = nodes.map((node) => {
    const [leftHeight, height] = [node.drawn * leftScale, node.drawn * rightScale];
    const [leftY, y] = [leftOffset, rightOffset];
    leftOffset += leftHeight;
    rightOffset += height + NODE.gap;
    return { ...node, leftY, leftHeight, y, height };
  });
  return (
    <svg
      viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
      className="block h-auto w-full"
      role="img"
      aria-label={`支給 ${yen(granted)} の使いみち`}
    >
      {placed.map((node) => (
        <path
          key={node.key}
          d={ribbon(node.leftY, node.leftHeight, node.y, node.height)}
          className={node.kind === "unused" ? "fill-muted" : "fill-primary"}
          opacity={node.kind === "unused" ? 0.55 : 0.28}
        />
      ))}
      <rect
        x={NODE.leftX}
        y={BODY.top}
        width={NODE.width}
        height={BODY.height}
        className="fill-primary"
      />
      <text
        x={NODE.leftX}
        y={BODY.top + BODY.height + 14}
        className="fill-foreground font-latin"
        fontSize={LABEL.fontSize}
      >
        {`支給 ${yen(granted)}`}
      </text>
      {placed.map((node) => (
        <g key={node.key}>
          <rect
            x={NODE.rightX}
            y={node.y}
            width={NODE.width}
            height={node.height}
            className={cn(
              node.kind === "unused" ? "fill-muted stroke-disabled-border" : "fill-primary",
            )}
            strokeWidth={node.kind === "unused" ? 1 : 0}
          />
          <text
            x={NODE.rightX + NODE.width + LABEL.offset}
            y={node.y + node.height / 2 + 3}
            className={node.kind === "unused" ? "fill-muted-foreground" : "fill-foreground"}
            fontSize={LABEL.fontSize}
          >
            {`${node.label} ${yen(node.totalAmount)}`}
          </text>
        </g>
      ))}
    </svg>
  );
}
