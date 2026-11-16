import "server-only";
import SectionCard from "@/client/components/layout/SectionCard";
import MonthlyChart from "@/client/components/top-page/features/charts/MonthlyChart";
import MonthlyChartScroll from "@/client/components/top-page/features/charts/MonthlyChartScroll";

interface MonthlyData {
  yearMonth: string;
  income: number;
  expense: number;
}

const LEGEND = [
  { label: "収入", color: "#2AA693", className: "h-3 rounded-[4px]" },
  { label: "支出", color: "#DC2626", className: "h-3 rounded-[4px]" },
  { label: "収支", color: "#4B5563", className: "h-0.5" },
];

interface MonthlyTrendsSectionProps {
  monthlyData?: MonthlyData[];
  updatedAt: string;
  /** 見出しの上の小さな行（例: 「チームみらい・2026年」） */
  eyebrow: string;
}

export default function MonthlyTrendsSection({
  monthlyData,
  updatedAt,
  eyebrow,
}: MonthlyTrendsSectionProps) {
  return (
    <SectionCard
      id="monthly-trends"
      iconSrc="/icons/icon-barchart.svg"
      iconLabel="Bar chart icon"
      eyebrow={eyebrow}
      title="月ごとの収支推移"
      updatedAt={updatedAt}
    >
      <MonthlyChartScroll>
        <MonthlyChart data={monthlyData || []} />
      </MonthlyChartScroll>

      <div className="-mt-4 flex flex-wrap justify-end gap-3 text-sm font-bold text-[#4B5563]">
        {LEGEND.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <span
              className={`inline-block w-3 ${item.className}`}
              style={{ background: item.color }}
            />
            {item.label}
          </span>
        ))}
      </div>
    </SectionCard>
  );
}
