import "server-only";
import SectionCard from "@/client/components/layout/SectionCard";
import ResearchFundMonthlyChart from "@/client/components/research-fund/ResearchFundMonthlyChart";
import type { ResearchFundPageData } from "@/server/contexts/research-fund/domain/models/research-fund-page";

interface Props {
  data: ResearchFundPageData;
  /** 見出しの上の小さな行（例: 「峰島侑也の調研費・2026年」） */
  eyebrow: string;
  updatedAt: string;
}

const LEGEND = [
  { label: "支給", color: "#2AA693" },
  { label: "支出", color: "#DC2626" },
];

/** 月ごとの支出の推移。 */
export default function ResearchFundMonthlySection({ data, eyebrow, updatedAt }: Props) {
  return (
    <SectionCard
      id="monthly-trends"
      iconSrc="/icons/icon-barchart.svg"
      iconLabel="Bar chart icon"
      eyebrow={eyebrow}
      title="月ごとの支出の推移"
      updatedAt={updatedAt}
    >
      <div className="-mr-[18px] overflow-x-auto sm:mr-0">
        <div className="min-w-[640px]">
          <ResearchFundMonthlyChart monthly={data.monthly} />
        </div>
      </div>

      <div className="-mt-4 flex flex-wrap justify-end gap-3 text-sm font-bold text-[#4B5563]">
        {LEGEND.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3" style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
    </SectionCard>
  );
}
