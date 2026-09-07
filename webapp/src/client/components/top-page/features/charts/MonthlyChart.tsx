"use client";
import "client-only";

import type { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";

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
  const allValues = [...incomeData, ...expenseData, ...balanceData];
  const maxAbsValue = Math.max(...allValues.map((val) => Math.abs(val)));
  const maxWithMargin = maxAbsValue * 1.2; // 20%のマージンを追加

  // maxAbsValueに応じて刻み幅を決定し、四捨五入
  let yAxisMax: number;
  let tickInterval: number;
  if (maxAbsValue > 500000000) {
    // 5億円より大きい場合は1億円刻み
    tickInterval = 100000000;
    yAxisMax = Math.round(maxWithMargin / tickInterval) * tickInterval;
  } else {
    // 5億円以下の場合は1000万円刻み
    tickInterval = 10000000;
    yAxisMax = Math.round(maxWithMargin / tickInterval) * tickInterval;
  }
  const yAxisMin = -yAxisMax;

  // 明示的な目盛り位置を生成
  const tickValues: number[] = [];
  for (let i = yAxisMin; i <= yAxisMax; i += tickInterval) {
    tickValues.push(i);
  }

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
          formatter: (val: number) => {
            if (val === 0) return "0万円";
            const manEn = val / 10000; // 円を万円に変換
            const absManEn = Math.abs(manEn);
            if (absManEn >= 10000) {
              return `${(manEn / 10000).toFixed(0)}億円`;
            }
            return `${manEn.toFixed(0)}万円`;
          },
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

        const incomeManEn = (income / 10000).toFixed(0);
        const expenseManEn = (expense / 10000).toFixed(0);
        const balanceManEn = (balance / 10000).toFixed(0);

        const formattedIncome = parseInt(incomeManEn, 10).toLocaleString();
        const formattedExpense = parseInt(expenseManEn, 10).toLocaleString();
        const formattedBalance = parseInt(balanceManEn, 10).toLocaleString();
        const balanceSign = balance >= 0 ? "+" : "";

        return `
          <div class="monthly-tooltip">
            <div class="tooltip-row">
              <span class="tooltip-label">収入</span>
              <span class="tooltip-value income-value">${formattedIncome}<span class="tooltip-unit">万円</span></span>
            </div>
            <div class="tooltip-row">
              <span class="tooltip-label">支出</span>
              <span class="tooltip-value expense-value">${formattedExpense}<span class="tooltip-unit">万円</span></span>
            </div>
            <div class="tooltip-row">
              <span class="tooltip-label">収支</span>
              <span class="tooltip-value balance-value">${balanceSign}${formattedBalance}<span class="tooltip-unit">万円</span></span>
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
