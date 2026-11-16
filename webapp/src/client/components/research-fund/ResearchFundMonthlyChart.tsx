"use client";
import "client-only";

import { useState } from "react";
import { calcSymmetricYAxisScale } from "@/client/lib/chart-axis";
import { formatYen } from "@/client/lib/format-yen";
import {
  BAR_GAP,
  barDownPath,
  barUpPath,
  monthlyBarHeight,
  monthlyBarWidth,
} from "@/client/lib/monthly-bar-path";
import type { ResearchFundMonthView } from "@/server/contexts/research-fund/domain/models/research-fund-page";

const WIDTH = 936;
const HEIGHT = 462;
const MARGIN = { top: 20, right: 24, bottom: 44, left: 88 };
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom;
const ZERO_Y = MARGIN.top + PLOT_HEIGHT / 2;

const GRANT_COLOR = "#2AA693";
const SPEND_COLOR = "#DC2626";
const ZERO_LINE_COLOR = "#9CA3AF";
const LABEL_COLOR = "#4B5563";
const EMPTY_MONTH_LABEL_COLOR = "#B6BCC6";

interface MonthlyChartScale {
  /** 下から上へ並んだ目盛りの値（0を挟んで上下対称） */
  ticks: number[];
  yMax: number;
}

/**
 * Y軸の目盛りと単位。政治団体ページの月次グラフ（MonthlyChart）と同じく
 * chart-axis の規則（1/2/5×10ⁿ 刻み・0を挟んで対称）で決める。
 * 未公開の月は金額が 0 なので、公開済みの月だけを対象にする。
 */
export function calcResearchFundMonthlyScale(
  monthly: readonly ResearchFundMonthView[],
): MonthlyChartScale {
  const maxAbsValue = Math.max(
    0,
    ...monthly
      .filter((month) => month.published)
      .map((month) => Math.max(month.granted, month.spent)),
  );
  const { max, tickInterval } = calcSymmetricYAxisScale(maxAbsValue);
  return {
    ticks: [-2, -1, 0, 1, 2].map((step) => step * tickInterval),
    yMax: max,
  };
}

interface TooltipState {
  index: number;
  x: number;
  y: number;
  /** ホバー時点の描画サイズ。端の月でツールチップを内側へ反転させるのに使う */
  width: number;
  height: number;
}

const TOOLTIP_OFFSET = 12;

/** カーソルが右半分・下半分にあるときは、表示領域からはみ出さないよう左側・上側に出す。 */
function tooltipPosition({ x, y, width, height }: TooltipState) {
  return {
    ...(x > width / 2 ? { right: width - x + TOOLTIP_OFFSET } : { left: x + TOOLTIP_OFFSET }),
    ...(y > height / 2 ? { bottom: height - y + TOOLTIP_OFFSET } : { top: y + TOOLTIP_OFFSET }),
  };
}

/**
 * B-2 1年間の推移。中央のゼロ線から上が支給、下が支出の上下対向の棒グラフ。
 * 棒は細めにし、外側の端だけ角を丸め、0の線側は少しあける（v9）。
 * データのない月（当選前・未到来）は棒を描かず、月ラベルを薄くして表す。
 */
export default function ResearchFundMonthlyChart({
  monthly,
}: {
  monthly: ResearchFundMonthView[];
}) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const { ticks, yMax } = calcResearchFundMonthlyScale(monthly);
  const pixelsPerYen = PLOT_HEIGHT / 2 / yMax;
  const step = (WIDTH - MARGIN.left - MARGIN.right) / Math.max(monthly.length, 1);
  const barWidth = monthlyBarWidth(step);
  const tooltipMonth = tooltip ? monthly[tooltip.index] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        role="img"
        aria-label="月ごとの調査研究費の支給と支出"
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const viewBoxX = ((event.clientX - rect.left) / rect.width) * WIDTH;
          const index = Math.floor((viewBoxX - MARGIN.left) / step);
          setTooltip(
            monthly[index]?.published
              ? {
                  index,
                  x: event.clientX - rect.left,
                  y: event.clientY - rect.top,
                  width: rect.width,
                  height: rect.height,
                }
              : null,
          );
        }}
        onMouseLeave={() => setTooltip(null)}
      >
        <title>月ごとの調査研究費の支給と支出</title>
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
            {formatYen(value)}
          </text>
        ))}
        {monthly.map((month, index) => {
          const centerX = MARGIN.left + step * index + step / 2;
          const x = centerX - barWidth / 2;
          const monthLabel = `${Number(month.month.slice(5, 7))}月`;
          const grantHeight = monthlyBarHeight(month.granted, pixelsPerYen);
          return (
            <g key={month.month}>
              {month.published && (
                <g className="cursor-pointer">
                  <rect
                    x={MARGIN.left + step * index}
                    y={MARGIN.top}
                    width={step}
                    height={PLOT_HEIGHT}
                    fill="transparent"
                  />
                  {month.granted > 0 && (
                    <path
                      d={barUpPath(x, ZERO_Y - BAR_GAP - grantHeight, barWidth, grantHeight)}
                      fill={GRANT_COLOR}
                    />
                  )}
                  {month.spent > 0 && (
                    <path
                      d={barDownPath(
                        x,
                        ZERO_Y + BAR_GAP,
                        barWidth,
                        monthlyBarHeight(month.spent, pixelsPerYen),
                      )}
                      fill={SPEND_COLOR}
                    />
                  )}
                </g>
              )}
              <text
                x={centerX}
                y={MARGIN.top + PLOT_HEIGHT + 24}
                textAnchor="middle"
                fontSize={13}
                fontWeight={500}
                fill={month.published ? LABEL_COLOR : EMPTY_MONTH_LABEL_COLOR}
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
          stroke={ZERO_LINE_COLOR}
          strokeWidth={1}
        />
      </svg>

      {/* SVG は role="img" で1枚の画像として読まれるため、月別の金額は表で読み上げられるようにする。
          表要素には height / overflow が効かず、sr-only を直接付けると13行分の高さが残って
          横スクロール用のラッパーに縦スクロールが出るので、div で包んで隠す。 */}
      <div className="sr-only">
        <table>
          <caption>月ごとの調査研究費の支給と支出</caption>
          <thead>
            <tr>
              <th scope="col">月</th>
              <th scope="col">支給</th>
              <th scope="col">支出</th>
            </tr>
          </thead>
          <tbody>
            {monthly.map((month) => (
              <tr key={month.month}>
                <th scope="row">{`${Number(month.month.slice(5, 7))}月`}</th>
                <td>{month.published ? formatYen(month.granted) : "データなし"}</td>
                <td>{month.published ? formatYen(month.spent) : "データなし"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {tooltip && tooltipMonth && (
        <div
          className="pointer-events-none absolute z-10 min-w-max rounded-[6px] border border-[#64748B] bg-white/85 px-[22px] py-[11px] shadow-md"
          style={tooltipPosition(tooltip)}
        >
          {[
            { label: "支給", value: tooltipMonth.granted, color: "#238778" },
            { label: "支出", value: tooltipMonth.spent, color: SPEND_COLOR },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4">
              <span className="text-[13px] font-bold leading-[1.31] text-[#4B5563]">
                {row.label}
              </span>
              <span className="text-sm font-bold leading-normal" style={{ color: row.color }}>
                {formatYen(row.value)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
