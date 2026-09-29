"use client";
import "client-only";

import { useState } from "react";
import {
  type AmountUnit,
  calcSymmetricYAxisScale,
  formatAmountIn,
  MAN_YEN,
  pickAmountUnit,
} from "@/client/lib/chart-axis";
import type { ResearchFundMonthView } from "@/server/contexts/research-fund/domain/models/research-fund-page";

const WIDTH = 936;
const HEIGHT = 462;
const MARGIN = { top: 20, right: 24, bottom: 44, left: 88 };
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom;
const ZERO_Y = MARGIN.top + PLOT_HEIGHT / 2;
const MAX_BAR_WIDTH = 52.5;

const GRANT_COLOR = "#2AA693";
const SPEND_COLOR = "#DC2626";
const AXIS_COLOR = "#E2E8F0";
const ZERO_LINE_COLOR = "#4B5563";
const LABEL_COLOR = "#4B5563";
const EMPTY_MONTH_LABEL_COLOR = "#B6BCC6";

interface MonthlyChartScale {
  /** 下から上へ並んだ目盛りの値（0を挟んで上下対称） */
  ticks: number[];
  unit: AmountUnit;
  yMax: number;
}

/**
 * Y軸の目盛りと単位。政治団体ページの月次グラフ（MonthlyChart）と同じく
 * chart-axis の規則（1/2/5×10ⁿ 刻み・0を挟んで対称・刻み幅に合わせた単位）で決める。
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
    unit: pickAmountUnit(tickInterval),
    yMax: max,
  };
}

/** ツールチップの単位。1万円未満しかない月は円で出す（MonthlyChart と同じ）。 */
function tooltipUnit(month: ResearchFundMonthView): AmountUnit {
  return Math.max(month.granted, month.spent) < MAN_YEN ? "円" : "万円";
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

function amountText(value: number, unit: AmountUnit): string {
  return `${formatAmountIn(value, unit)}${unit}`;
}

/**
 * B-2 1年間の推移。中央のゼロ線から上が支給、下が支出の上下対向の棒グラフ。
 * データのない月（当選前・未到来）は棒を描かず、月ラベルを薄くして表す。
 */
export default function ResearchFundMonthlyChart({
  monthly,
}: {
  monthly: ResearchFundMonthView[];
}) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const { ticks, unit, yMax } = calcResearchFundMonthlyScale(monthly);
  const pixelsPerYen = PLOT_HEIGHT / 2 / yMax;
  const step = (WIDTH - MARGIN.left - MARGIN.right) / Math.max(monthly.length, 1);
  const barWidth = Math.min(MAX_BAR_WIDTH, step * 0.62);
  const tooltipMonth = tooltip ? monthly[tooltip.index] : null;
  const tooltipRowUnit = tooltipMonth ? tooltipUnit(tooltipMonth) : "万円";

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
            {amountText(value, unit)}
          </text>
        ))}
        <line
          x1={MARGIN.left}
          y1={MARGIN.top}
          x2={MARGIN.left}
          y2={MARGIN.top + PLOT_HEIGHT}
          stroke={AXIS_COLOR}
        />
        <line
          x1={MARGIN.left}
          y1={MARGIN.top + PLOT_HEIGHT}
          x2={WIDTH - MARGIN.right}
          y2={MARGIN.top + PLOT_HEIGHT}
          stroke={AXIS_COLOR}
        />
        {monthly.map((month, index) => {
          const centerX = MARGIN.left + step * index + step / 2;
          const x = centerX - barWidth / 2;
          const monthLabel = `${Number(month.month.slice(5, 7))}月`;
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
                  <rect
                    x={x}
                    y={ZERO_Y - month.granted * pixelsPerYen}
                    width={barWidth}
                    height={month.granted * pixelsPerYen}
                    fill={GRANT_COLOR}
                  />
                  <rect
                    x={x}
                    y={ZERO_Y}
                    width={barWidth}
                    height={month.spent * pixelsPerYen}
                    fill={SPEND_COLOR}
                  />
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
            {monthly.map((month) => {
              const rowUnit = tooltipUnit(month);
              return (
                <tr key={month.month}>
                  <th scope="row">{`${Number(month.month.slice(5, 7))}月`}</th>
                  <td>{month.published ? amountText(month.granted, rowUnit) : "データなし"}</td>
                  <td>{month.published ? amountText(month.spent, rowUnit) : "データなし"}</td>
                </tr>
              );
            })}
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
                {formatAmountIn(row.value, tooltipRowUnit)}
                <span className="text-[13px] leading-[1.31]">{tooltipRowUnit}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
