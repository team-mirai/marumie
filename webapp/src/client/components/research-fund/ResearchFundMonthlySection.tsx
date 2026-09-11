import "server-only";
import Image from "next/image";
import CardHeader from "@/client/components/layout/CardHeader";
import MainColumnCard from "@/client/components/layout/MainColumnCard";
import ResearchFundMonthlyChart from "@/client/components/research-fund/ResearchFundMonthlyChart";
import type { ResearchFundPageData } from "@/server/contexts/research-fund/domain/models/research-fund-page";

interface Props {
  data: ResearchFundPageData;
  updatedAt: string;
}

const LEGEND = [
  { label: "支給", color: "#2AA693" },
  { label: "支出", color: "#DC2626" },
  { label: "未公開", color: null },
];

/** B-2 1年間の推移。 */
export default function ResearchFundMonthlySection({ data, updatedAt }: Props) {
  return (
    <MainColumnCard id="monthly-trends">
      <CardHeader
        icon={<Image src="/icons/icon-barchart.svg" alt="Bar chart icon" width={30} height={30} />}
        organizationName={data.politician.name}
        title="月ごとの支出の推移"
        updatedAt={updatedAt}
        subtitle="今年の月ごとの支給と支出"
      />

      <div className="-mr-[18px] overflow-x-auto sm:mr-0">
        <div className="min-w-[640px]">
          <ResearchFundMonthlyChart monthly={data.monthly} />
        </div>
      </div>

      <div className="-mt-4 flex flex-wrap justify-end gap-3 text-sm font-bold text-[#4B5563]">
        {LEGEND.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3"
              style={
                item.color
                  ? { background: item.color }
                  : { border: "1px dashed #C3C8D0", background: "transparent" }
              }
            />
            {item.label}
          </span>
        ))}
      </div>

      <div className="text-right md:hidden">
        <span className="text-xs font-normal leading-[1.33] text-[#9CA3AF]">{updatedAt}</span>
      </div>
    </MainColumnCard>
  );
}
