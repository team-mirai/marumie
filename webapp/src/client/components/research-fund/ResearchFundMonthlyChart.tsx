import type { ResearchFundMonthView } from "@/server/contexts/research-fund/domain/models/research-fund-page";

const WIDTH = 936;
const HEIGHT = 420;
const MARGIN = { top: 20, right: 24, bottom: 44, left: 88 };
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom;
const ZERO_Y = MARGIN.top + PLOT_HEIGHT / 2;
const BAR_WIDTH = 40;

const GRANT_COLOR = "#2AA693";
const SPEND_COLOR = "#DC2626";
const AXIS_COLOR = "#E2E8F0";
const LABEL_COLOR = "#4B5563";

/** 目盛りの候補。ラベルが6本を超えない一番細かい刻みを選ぶ。 */
const TICK_CANDIDATES = [100_000, 500_000, 1_000_000, 5_000_000, 10_000_000, 50_000_000];

function formatMan(amount: number): string {
  return `${Math.round(amount / 10000).toLocaleString("ja-JP")}万円`;
}

function scaleOf(monthly: readonly ResearchFundMonthView[]) {
  const maxAbs = Math.max(1, ...monthly.map((month) => Math.max(month.granted, month.spent)));
  const target = maxAbs * 1.2;
  const tick =
    TICK_CANDIDATES.find((candidate) => target / candidate <= 6) ??
    TICK_CANDIDATES[TICK_CANDIDATES.length - 1];
  const yMax = Math.max(tick, Math.ceil(target / tick) * tick);
  return { tick, yMax, pixelsPerYen: PLOT_HEIGHT / 2 / yMax };
}

/**
 * B-2 1年間の推移。中央のゼロ線から上が支給、下が支出の上下対向の棒グラフ。
 * まだ公開していない月は、データが無いのではないことが伝わるよう点線の空枠で描く。
 */
export default function ResearchFundMonthlyChart({
  monthly,
}: {
  monthly: ResearchFundMonthView[];
}) {
  const { tick, yMax, pixelsPerYen } = scaleOf(monthly);
  const step = (WIDTH - MARGIN.left - MARGIN.right) / Math.max(monthly.length, 1);
  const ticks: number[] = [];
  for (let value = -yMax; value <= yMax; value += tick) ticks.push(value);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width="100%"
      role="img"
      aria-label="月ごとの調査研究費の支給と支出"
    >
      <title>月ごとの調査研究費の支給と支出</title>
      {/* ticks はゼロ線の下側を負の座標で持つが、支出額そのものは非負なのでラベルに符号は出さない。 */}
      {ticks.map((value) => (
        <text
          key={`tick-${value}`}
          x={MARGIN.left - 12}
          y={ZERO_Y - value * pixelsPerYen}
          textAnchor="end"
          dominantBaseline="middle"
          fontSize={14}
          fontWeight={500}
          fill={LABEL_COLOR}
        >
          {formatMan(Math.abs(value))}
        </text>
      ))}
      <line
        x1={MARGIN.left}
        y1={MARGIN.top}
        x2={MARGIN.left}
        y2={MARGIN.top + PLOT_HEIGHT}
        stroke={AXIS_COLOR}
      />
      {monthly.map((month, index) => {
        const centerX = MARGIN.left + step * index + step / 2;
        const x = centerX - BAR_WIDTH / 2;
        const monthLabel = `${Number(month.month.slice(5, 7))}月`;
        return (
          <g key={month.month}>
            {month.published ? (
              <>
                <rect
                  x={x}
                  y={ZERO_Y - month.granted * pixelsPerYen}
                  width={BAR_WIDTH}
                  height={month.granted * pixelsPerYen}
                  fill={GRANT_COLOR}
                />
                <rect
                  x={x}
                  y={ZERO_Y}
                  width={BAR_WIDTH}
                  height={month.spent * pixelsPerYen}
                  fill={SPEND_COLOR}
                />
              </>
            ) : (
              <rect
                x={x}
                y={ZERO_Y - tick * pixelsPerYen}
                width={BAR_WIDTH}
                height={tick * pixelsPerYen}
                fill="none"
                stroke="#C3C8D0"
                strokeDasharray="4 4"
              />
            )}
            <text
              x={centerX}
              y={MARGIN.top + PLOT_HEIGHT + 24}
              textAnchor="middle"
              fontSize={14}
              fontWeight={500}
              fill={month.published ? LABEL_COLOR : "#9CA3AF"}
            >
              {monthLabel}
            </text>
          </g>
        );
      })}
      <line
        x1={MARGIN.left}
        y1={ZERO_Y}
        x2={WIDTH - MARGIN.right}
        y2={ZERO_Y}
        stroke={LABEL_COLOR}
      />
    </svg>
  );
}
