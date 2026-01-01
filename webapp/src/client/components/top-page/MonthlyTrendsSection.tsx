import "server-only";
import Image from "next/image";
import CardHeader from "@/client/components/layout/CardHeader";
import MainColumnCard from "@/client/components/layout/MainColumnCard";
import MonthlyChart from "./features/charts/MonthlyChart";

interface MonthlyData {
  yearMonth: string;
  income: number;
  expense: number;
}

interface MonthlyTrendsSectionProps {
  monthlyData?: MonthlyData[];
  updatedAt: string;
  organizationName?: string;
}

export default function MonthlyTrendsSection({
  monthlyData,
  updatedAt,
  organizationName,
}: MonthlyTrendsSectionProps) {
  return (
    <MainColumnCard id="monthly-trends">
      <CardHeader
        icon={<Image src="/icons/icon-barchart.svg" alt="Bar chart icon" width={30} height={30} />}
        organizationName={organizationName || "未登録の政治団体"}
        title="月ごとの収支の推移"
        updatedAt={updatedAt}
        subtitle="今年の月ごとの収入と支出"
      />

      {/* 月次チャート表示 - モバイルのみ右端まで拡張 */}
      <div className="-mr-[18px] sm:mr-0">
        <MonthlyChart data={monthlyData || []} />
      </div>

      {/* 更新日時 */}
      <div className="mt-4 text-right md:hidden">
        <span className="text-xs font-normal text-[#9CA3AF] leading-[1.33]">{updatedAt}</span>
      </div>
    </MainColumnCard>
  );
}
