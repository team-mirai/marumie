"use client";
import "client-only";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyDonationData } from "@/server/repositories/interfaces/transaction-repository.interface";

interface DonationChartProps {
  data: DailyDonationData[];
  height?: number;
}

interface ChartDataPoint {
  date: string;
  displayDate: string;
  cumulativeAmount: number;
}

export default function DonationChart({ data, height = 287 }: DonationChartProps) {
  // BFF側で既に90日分に絞られているので、全データを使用
  const chartData: ChartDataPoint[] = data.map((item) => ({
    date: item.date,
    displayDate: formatXAxisLabel(item.date),
    cumulativeAmount: item.cumulativeAmount,
  }));

  // X軸ラベル用日付フォーマット (M/d形式)
  function formatXAxisLabel(dateStr: string): string {
    const [, month, day] = dateStr.split("-");
    return `${parseInt(month, 10)}/${parseInt(day, 10)}`;
  }

  // Y軸ラベル用億単位フォーマット
  function formatYAxisLabel(value: number): string {
    if (value === 0) return "0円";
    const okuValue = value / 100000000;
    if (okuValue >= 1) {
      return `${okuValue.toFixed(1)}億`;
    }
    const manValue = value / 10000;
    if (manValue >= 1) {
      return `${manValue.toFixed(0)}万`;
    }
    return `${value}円`;
  }

  // データが空の場合
  if (chartData.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg flex items-center justify-center" style={{ height }}>
        <div className="text-center text-gray-500">
          <div className="text-lg font-medium mb-2">直近3ヶ月の寄附金額の推移</div>
          <div className="text-sm">データがありません</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-lg "
      style={{ height }}
      role="img"
      aria-label="直近3ヶ月の寄附金額の推移グラフ"
      aria-describedby="donation-chart-description"
    >
      <div className="text-center">
        <h4 className="text-[13px] font-bold leading-[1.31] text-gray-600">
          直近3ヶ月の寄附金額の推移
        </h4>
      </div>
      <div id="donation-chart-description" className="sr-only">
        直近90日間の累計寄附金額の推移を示す折れ線グラフです。
      </div>
      <div
        style={{ height: height }}
        className="[&_.recharts-line]:outline-none [&_.recharts-area]:outline-none [&_.recharts-cartesian-grid]:outline-none [&_*]:outline-none"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 4,
              bottom: 20,
            }}
          >
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#6B7280" }}
              interval="preserveStartEnd"
              tickFormatter={formatXAxisLabel}
            />
            <YAxis
              tickFormatter={formatYAxisLabel}
              axisLine={{ stroke: "#E5E7EB", strokeWidth: 1 }}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#6B7280" }}
              width={50}
              tickMargin={5}
            />
            <CartesianGrid
              horizontal={true}
              vertical={false}
              strokeDasharray="none"
              stroke="#E5E7EB"
              strokeWidth={1}
            />
            <Tooltip
              formatter={(value: number) => {
                const oku = Math.floor(value / 100000000);
                const man = Math.floor((value % 100000000) / 10000);
                const en = value % 10000;
                const amountStr = `${oku > 0 ? `${oku}億` : ""}${man > 0 ? `${man}万` : ""}${en > 0 ? `${en}` : ""}円`;
                return [amountStr, "累計寄附金額"];
              }}
              labelFormatter={(label: string) => {
                const [year, month, day] = label.split("-");
                return `${year}年${parseInt(month, 10)}月${parseInt(day, 10)}日`;
              }}
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
            />
            <Line
              type="monotone"
              dataKey="cumulativeAmount"
              stroke="#2AA693"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 4, fill: "#2AA693" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
