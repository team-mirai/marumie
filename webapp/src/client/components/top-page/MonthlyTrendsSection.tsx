import "server-only";
import SectionCard from "@/client/components/layout/SectionCard";
import MonthlyChart from "./features/charts/MonthlyChart";

interface MonthlyData {
  yearMonth: string;
  income: number;
  expense: number;
}

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
      title="毎月の収支推移"
      updatedAt={updatedAt}
    >
      {/* 月次チャート表示 - モバイルのみ右端まで拡張 */}
      <div className="-mr-[18px] sm:mr-0">
        <MonthlyChart data={monthlyData || []} />
      </div>
    </SectionCard>
  );
}
