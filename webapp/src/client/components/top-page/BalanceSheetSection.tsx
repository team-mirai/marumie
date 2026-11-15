import "server-only";
import SectionCard from "@/client/components/layout/SectionCard";
import type { BalanceSheetData } from "@/types/balance-sheet";
import BalanceSheetChart from "./features/charts/BalanceSheetChart";

interface BalanceSheetSectionProps {
  data?: BalanceSheetData;
  /** 例: 「2026.10.23更新」。過去年度は「2025.12.31時点」のように基準日を出す */
  updatedAt: string;
  /** 見出しの上の小さな行（例: 「チームみらい・2026年」） */
  eyebrow: string;
}

export default function BalanceSheetSection({
  data,
  updatedAt,
  eyebrow,
}: BalanceSheetSectionProps) {
  return (
    <SectionCard
      id="balance-sheet"
      iconSrc="/icons/balance.svg"
      iconLabel="Balance sheet icon"
      eyebrow={eyebrow}
      title="貸借対照表"
      updatedAt={updatedAt}
    >
      {data ? (
        <BalanceSheetChart data={data} />
      ) : (
        <div className="flex justify-center items-center h-80 text-gray-500">
          データを読み込み中...
        </div>
      )}
    </SectionCard>
  );
}
