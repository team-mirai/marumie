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

const WIDTH = 936;
const HEIGHT = 462;
const MARGIN = { top: 20, right: 24, bottom: 44, left: 96 };
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom;
const ZERO_Y = MARGIN.top + PLOT_HEIGHT / 2;

const INCOME_COLOR = "#2AA693";
const EXPENSE_COLOR = "#DC2626";
const BALANCE_COLOR = "#4B5563";
const ZERO_LINE_COLOR = "#9CA3AF";
const LABEL_COLOR = "#4B5563";

const CHART_LABEL = "月ごとの収入・支出";

interface MonthlyData {
  yearMonth: string;
  income: number;
  expense: number;
}

interface MonthlyChartProps {
  data: MonthlyData[];
}

interface TooltipState {
  index: number;
  x: number;
  y: number;
  /** ホバー時点の描画サイズ。端の月でツールチップを内側へ反転させるのに使う */
  width: number;
  height: number;
  /** カーソルが見えている範囲の右半分にあるか。true ならツールチップを左側に出す */
  flipX: boolean;
}

const TOOLTIP_OFFSET = 12;

/** カーソルが右半分・下半分にあるときは、表示領域からはみ出さないよう左側・上側に出す。 */
function tooltipPosition({ x, y, width, height, flipX }: TooltipState) {
  return {
    ...(flipX ? { right: width - x + TOOLTIP_OFFSET } : { left: x + TOOLTIP_OFFSET }),
    ...(y > height / 2 ? { bottom: height - y + TOOLTIP_OFFSET } : { top: y + TOOLTIP_OFFSET }),
  };
}

function monthLabel(yearMonth: string): string {
  const [, month] = yearMonth.split("-");
  return `${parseInt(month, 10)}月`;
}

/**
 * 政党・政治団体の月ごとの収支推移。中央の0の線から上が収入、下が支出の棒で、収支を折れ線で重ねる。
 * 棒は細めにし、外側の端だけ角を丸め、0の線側は少しあける（v9）。
 */
export default function MonthlyChart({ data }: MonthlyChartProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // データが空の場合
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg flex items-center justify-center h-[462px]">
        <div className="text-center text-gray-500">
          <div className="text-lg font-medium mb-2">月ごとの収支推移のグラフ</div>
          <div className="text-sm">データがありません</div>
        </div>
      </div>
    );
  }

  // 刻み幅は桁数（log10）から決めるため、金額が小さくてもレンジが 0 に潰れない
  const maxAbsValue = Math.max(
    ...data.map((item) =>
      Math.max(item.income, item.expense, Math.abs(item.income - item.expense)),
    ),
  );
  const { max: yMax, tickInterval } = calcSymmetricYAxisScale(maxAbsValue);
  const ticks = [-2, -1, 0, 1, 2].map((step) => step * tickInterval);
  const pixelsPerYen = PLOT_HEIGHT / 2 / yMax;
  const step = (WIDTH - MARGIN.left - MARGIN.right) / data.length;
  const barWidth = monthlyBarWidth(step);
  const centerX = (index: number) => MARGIN.left + step * index + step / 2;
  const balancePoints = data.map(
    (item, index) =>
      [centerX(index), ZERO_Y - (item.income - item.expense) * pixelsPerYen] as const,
  );
  const tooltipMonth = tooltip ? data[tooltip.index] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        role="img"
        aria-label={CHART_LABEL}
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          // SP の横スクロール（MonthlyChartScroll）の中ではグラフの一部しか見えないので、
          // グラフ全体ではなく見えている範囲の中央を境に左右を決める
          const visible =
            event.currentTarget.closest(".monthly-hscroll")?.getBoundingClientRect() ?? rect;
          const visibleCenter =
            (Math.max(rect.left, visible.left) + Math.min(rect.right, visible.right)) / 2;
          const viewBoxX = ((event.clientX - rect.left) / rect.width) * WIDTH;
          const index = Math.floor((viewBoxX - MARGIN.left) / step);
          setTooltip(
            data[index]
              ? {
                  index,
                  x: event.clientX - rect.left,
                  y: event.clientY - rect.top,
                  width: rect.width,
                  height: rect.height,
                  flipX: event.clientX > visibleCenter,
                }
              : null,
          );
        }}
        onMouseLeave={() => setTooltip(null)}
      >
        <title>{CHART_LABEL}</title>
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
        {data.map((item, index) => {
          const x = centerX(index) - barWidth / 2;
          const incomeHeight = monthlyBarHeight(item.income, pixelsPerYen);
          return (
            <g key={item.yearMonth}>
              <g className="cursor-pointer">
                <rect
                  x={MARGIN.left + step * index}
                  y={MARGIN.top}
                  width={step}
                  height={PLOT_HEIGHT}
                  fill="transparent"
                />
                {item.income > 0 && (
                  <path
                    d={barUpPath(x, ZERO_Y - BAR_GAP - incomeHeight, barWidth, incomeHeight)}
                    fill={INCOME_COLOR}
                  />
                )}
                {item.expense > 0 && (
                  <path
                    d={barDownPath(
                      x,
                      ZERO_Y + BAR_GAP,
                      barWidth,
                      monthlyBarHeight(item.expense, pixelsPerYen),
                    )}
                    fill={EXPENSE_COLOR}
                  />
                )}
              </g>
              <text
                x={centerX(index)}
                y={MARGIN.top + PLOT_HEIGHT + 24}
                textAnchor="middle"
                fontSize={13}
                fontWeight={500}
                fill={LABEL_COLOR}
              >
                {monthLabel(item.yearMonth)}
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
        <polyline
          points={balancePoints.map(([x, y]) => `${x},${y}`).join(" ")}
          fill="none"
          stroke={BALANCE_COLOR}
          strokeWidth={2}
          pointerEvents="none"
        />
        {balancePoints.map(([x, y], index) => (
          <circle
            key={data[index].yearMonth}
            cx={x}
            cy={y}
            r={4}
            fill="#fff"
            stroke={BALANCE_COLOR}
            strokeWidth={2}
            pointerEvents="none"
          />
        ))}
      </svg>

      {/* SVG は role="img" で1枚の画像として読まれるため、月別の金額は表で読み上げられるようにする。
          表要素には height / overflow が効かず、sr-only を直接付けると行数分の高さが残って
          横スクロール用のラッパーに縦スクロールが出るので、div で包んで隠す。 */}
      <div className="sr-only">
        <table>
          <caption>{CHART_LABEL}</caption>
          <thead>
            <tr>
              <th scope="col">月</th>
              <th scope="col">収入</th>
              <th scope="col">支出</th>
              <th scope="col">収支</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.yearMonth}>
                <th scope="row">{monthLabel(item.yearMonth)}</th>
                <td>{formatYen(item.income)}</td>
                <td>{formatYen(item.expense)}</td>
                <td>{formatYen(item.income - item.expense)}</td>
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
            { label: "収入", value: tooltipMonth.income, color: "#238778" },
            { label: "支出", value: tooltipMonth.expense, color: EXPENSE_COLOR },
            {
              label: "収支",
              value: tooltipMonth.income - tooltipMonth.expense,
              color: "#1E293B",
            },
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
