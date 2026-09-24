"use client";
import "client-only";

import type { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";

import {
  type AmountUnit,
  calcSymmetricYAxisScale,
  formatAmountIn,
  MAN_YEN,
  pickAmountUnit,
} from "@/client/lib/chart-axis";

// ApexChartsを動的インポート（SSR対応）
const Chart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
  loading: () => (
    <div className="bg-gray-50 rounded-lg flex items-center justify-center h-[462px]">
      <div className="text-center text-gray-500">
        <div className="text-lg font-medium mb-2">チャート読み込み中...</div>
      </div>
    </div>
  ),
});

interface MonthlyData {
  yearMonth: string;
  income: number;
  expense: number;
}

interface MonthlyChartProps {
  data: MonthlyData[];
}

export default function MonthlyChart({ data }: MonthlyChartProps) {
  // データが空の場合
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg flex items-center justify-center h-[462px]">
        <div className="text-center text-gray-500">
          <div className="text-lg font-medium mb-2">月次収支推移グラフ</div>
          <div className="text-sm">データがありません</div>
        </div>
      </div>
    );
  }

  // 月のラベルを生成（1月〜12月）
  const months = data.map((item) => {
    const [, month] = item.yearMonth.split("-");
    return `${parseInt(month, 10)}月`;
  });

  // 収入・支出・収支データを準備
  const incomeData = data.map((item) => item.income);
  const expenseData = data.map((item) => -item.expense); // 負の値で表現
  const balanceData = data.map((item) => item.income - item.expense);

  // データの最大絶対値を取得してY軸の範囲を動的に設定
  // 刻み幅は桁数（log10）から決めるため、金額が小さくてもレンジが 0 に潰れない
  const allValues = [...incomeData, ...expenseData, ...balanceData];
  const maxAbsValue = Math.max(...allValues.map((val) => Math.abs(val)));
  const { min: yAxisMin, max: yAxisMax, tickInterval } = calcSymmetricYAxisScale(maxAbsValue);

  // 軸ラベルの単位は刻み幅にあわせて統一する（刻みが1万円未満なら円表示）
  const yAxisUnit = pickAmountUnit(tickInterval);

  // ApexChartsのseries設定
  const series = [
    {
      name: "収入",
      type: "column" as const,
      data: incomeData,
    },
    {
      name: "支出",
      type: "column" as const,
      data: expenseData,
    },
    {
      name: "収支",
      type: "line" as const,
      data: balanceData,
    },
  ];

  // ApexChartsのオプション設定
  const options: ApexOptions = {
    chart: {
      type: "line",
      height: 462,
      stacked: true,
      toolbar: {
        show: false,
      },
      background: "transparent",
      zoom: {
        enabled: false,
      },
      selection: {
        enabled: false,
      },
      events: {
        beforeMount: (chart) => {
          // チャートコンテナのタッチイベントを親要素に委譲
          if (typeof window !== "undefined" && "ontouchstart" in window) {
            // ApexCharts の型定義に el は無いが、実体はチャートのルート要素を持つ
            const chartEl = (chart as unknown as { el: HTMLElement }).el;
            chartEl.style.touchAction = "pan-x pan-y";
          }
        },
      },
    },
    colors: ["#2AA693", "#DC2626", "#4B5563"],
    states: {
      hover: {
        filter: {
          type: "none",
        },
      },
    },
    plotOptions: {
      bar: {
        columnWidth: "52.5px",
      },
    },
    stroke: {
      width: [0, 0, 2],
      curve: "smooth",
    },
    xaxis: {
      categories: months,
      labels: {
        style: {
          colors: "#4B5563",
          fontSize: "14px",
          fontFamily: "Noto Sans JP, sans-serif",
          fontWeight: 500,
        },
      },
      axisBorder: {
        show: true,
        color: "#E2E8F0",
      },
      axisTicks: {
        show: false,
      },
    },
    yaxis: [
      {
        title: {
          text: undefined,
        },
        labels: {
          formatter: (val: number) => `${formatAmountIn(val, yAxisUnit)}${yAxisUnit}`,
          style: {
            colors: "#4B5563",
            fontSize: "14px",
            fontFamily: "Noto Sans JP, sans-serif",
            fontWeight: 500,
          },
        },
        min: yAxisMin,
        max: yAxisMax,
        tickAmount: 4,
        forceNiceScale: false,
        // ApexChartsのY軸設定では、tickAmountで目盛り数を制御
        axisBorder: {
          show: true,
          color: "#E2E8F0",
        },
        axisTicks: {
          show: false,
        },
      },
    ],
    grid: {
      borderColor: "#E2E8F0",
      strokeDashArray: 0,
      xaxis: {
        lines: {
          show: false,
        },
      },
      yaxis: {
        lines: {
          show: false,
        },
      },
    },
    legend: {
      show: true,
      position: "bottom",
      horizontalAlign: "right",
      fontSize: "14px",
      fontFamily: "Noto Sans JP, sans-serif",
      fontWeight: 700,
      labels: {
        colors: "#4B5563",
      },
      markers: {
        size: 6,
        strokeWidth: 0,
        shape: "square" as const,
      },
      itemMargin: {
        horizontal: 6,
        vertical: 0,
      },
    },
    dataLabels: {
      enabled: false,
    },
    tooltip: {
      shared: true,
      intersect: false,
      custom: ({ series, dataPointIndex }) => {
        const income = series[0][dataPointIndex];
        const expense = Math.abs(series[1][dataPointIndex]); // 正の値に変換
        const balance = series[2][dataPointIndex];

        // 3つの値の最大値で単位を揃える。1万円未満しかない月は円表示にする
        const maxAbs = Math.max(Math.abs(income), Math.abs(expense), Math.abs(balance));
        const unit: AmountUnit = maxAbs < MAN_YEN ? "円" : "万円";

        const formattedIncome = formatAmountIn(income, unit);
        const formattedExpense = formatAmountIn(expense, unit);
        const formattedBalance = formatAmountIn(balance, unit);
        const balanceSign = balance >= 0 ? "+" : "";

        return `
          <div class="monthly-tooltip">
            <div class="tooltip-row">
              <span class="tooltip-label">収入</span>
              <span class="tooltip-value income-value">${formattedIncome}<span class="tooltip-unit">${unit}</span></span>
            </div>
            <div class="tooltip-row">
              <span class="tooltip-label">支出</span>
              <span class="tooltip-value expense-value">${formattedExpense}<span class="tooltip-unit">${unit}</span></span>
            </div>
            <div class="tooltip-row">
              <span class="tooltip-label">収支</span>
              <span class="tooltip-value balance-value">${balanceSign}${formattedBalance}<span class="tooltip-unit">${unit}</span></span>
            </div>
          </div>
        `;
      },
    },
    annotations: {
      yaxis: [
        {
          y: 0,
          borderColor: "#4B5563",
          borderWidth: 1,
          strokeDashArray: 0,
        },
        {
          y: yAxisMin,
          borderColor: "#E2E8F0",
          borderWidth: 1,
          strokeDashArray: 0,
        },
      ],
    },
  };

  // データ数に応じた動的横幅を計算
  const calculateWidth = (dataCount: number) => {
    const minWidth = 320; // 最小幅
    const maxWidth = 600; // 最大幅
    const widthPerData = 40; // データ1つあたりの幅
    const baseWidth = 200; // ベース幅（マージンなど）

    const calculatedWidth = baseWidth + dataCount * widthPerData;
    return Math.max(minWidth, Math.min(maxWidth, calculatedWidth));
  };

  const chartWidth = calculateWidth(data.length);

  return (
    <div
      className="overflow-x-auto overflow-y-hidden rounded-lg bg-white"
      role="img"
      aria-label="月次収支推移グラフ"
      aria-describedby="monthly-chart-description"
    >
      <div id="monthly-chart-description" className="sr-only">
        1年間の月別収入、支出、収支の推移を示す棒グラフです。
      </div>
      <div style={{ minWidth: `${chartWidth}px`, height: 462 }}>
        <Chart options={options} series={series} type="line" height={462} />
        <style jsx global>{`
          .apexcharts-tooltip-title {
            display: none !important;
          }
          .apexcharts-xaxistooltip {
            display: none !important;
          }
          .apexcharts-tooltip.apexcharts-theme-light {
            opacity: 1 !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
          }
          .monthly-tooltip {
            background: rgba(255, 255, 255, 0.85);
            border: 1px solid #64748B;
            border-radius: 6px;
            padding: 11px 22px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            font-family: 'Noto Sans JP', sans-serif;
            min-width: max-content;
            position: relative;
          }
          .tooltip-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2px;
          }
          .tooltip-row:last-child {
            margin-bottom: 0;
            margin-top: 4px;
          }
          .tooltip-label {
            font-weight: 700;
            font-size: 13px;
            line-height: 1.31;
            color: #4B5563;
          }
          .tooltip-value {
            font-weight: 700;
            font-size: 14px;
            line-height: 1.5;
          }
          .income-value {
            color: #238778;
          }
          .expense-value {
            color: #DC2626;
          }
          .balance-value {
            color: #1E293B;
          }
          .tooltip-unit {
            font-size: 13px;
            font-weight: 700;
            line-height: 1.31;
          }
          .income-value .tooltip-unit {
            color: #238778;
          }
          .expense-value .tooltip-unit {
            color: #DC2626;
          }
          .balance-value .tooltip-unit {
            color: #1E293B;
          }
          .apexcharts-canvas:hover {
            cursor: pointer;
          }
          .apexcharts-series path,
          .apexcharts-series rect {
            cursor: pointer;
          }
        `}</style>
      </div>
    </div>
  );
}
