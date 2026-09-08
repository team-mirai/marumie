import type { SummaryData } from "@/server/contexts/report/domain/models/summary-data";
import { formatCurrency } from "@/client/lib";
import {
  KeyValueGroupHeader,
  KeyValueRow,
  KeyValueTable,
} from "@/client/components/export-report/sections/KeyValueTable";
import { SectionCard } from "@/client/components/export-report/sections/SectionCard";
import { SectionHeading } from "@/client/components/export-report/sections/SectionHeading";

interface SummarySectionProps {
  summaryData: SummaryData;
}

function formatNullableCurrency(amount: number | null): string {
  if (amount === null) {
    return "-（未実装）";
  }
  return formatCurrency(amount);
}

export function SummarySection({ summaryData }: SummarySectionProps) {
  return (
    <div className="space-y-4">
      <SectionHeading>収支総括表</SectionHeading>

      <SectionCard title="収支総括表" formId="SYUUSHI07_02">
        <KeyValueTable>
          <KeyValueGroupHeader title="【収支総括】" />
          <KeyValueRow label="収入総額" value={formatCurrency(summaryData.syunyuSgk)} numeric />
          <KeyValueRow label="前年繰越額" value={formatCurrency(summaryData.zennenKksGk)} numeric />
          <KeyValueRow
            label="本年収入額"
            value={formatCurrency(summaryData.honnenSyunyuGk)}
            numeric
          />
          <KeyValueRow label="支出総額" value={formatCurrency(summaryData.sisyutuSgk)} numeric />
          <KeyValueRow
            label="翌年繰越額"
            value={formatCurrency(summaryData.yokunenKksGk)}
            numeric
          />

          <KeyValueGroupHeader title="【寄附の内訳】" />
          <KeyValueRow label="個人寄附" value={formatCurrency(summaryData.kojinKifuGk)} numeric />
          <KeyValueRow
            label="法人寄附"
            value={formatNullableCurrency(summaryData.hojinKifuGk)}
            numeric
          />
          <KeyValueRow
            label="政治団体寄附"
            value={formatNullableCurrency(summaryData.seijiKifuGk)}
            numeric
          />
          <KeyValueRow label="寄附小計" value={formatCurrency(summaryData.kifuSkeiGk)} numeric />
          <KeyValueRow label="寄附合計" value={formatCurrency(summaryData.kifuGkeiGk)} numeric />
        </KeyValueTable>
      </SectionCard>
    </div>
  );
}
