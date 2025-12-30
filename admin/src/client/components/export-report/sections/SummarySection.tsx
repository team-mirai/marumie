import type { SummaryData } from "@/server/contexts/report/domain/models/summary-data";

interface SummarySectionProps {
  summaryData: SummaryData;
}

function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

function formatNullableCurrency(amount: number | null): string {
  if (amount === null) {
    return "-（未実装）";
  }
  return formatCurrency(amount);
}

interface SummaryRowProps {
  label: string;
  value: string;
}

function SummaryRow({ label, value }: SummaryRowProps) {
  return (
    <tr className="border-b border-gray-200">
      <th className="py-2 px-4 text-left font-medium text-gray-700 bg-gray-50 w-1/3">{label}</th>
      <td className="py-2 px-4 text-gray-900 text-right">{value}</td>
    </tr>
  );
}

interface SectionHeaderProps {
  title: string;
}

function SectionHeader({ title }: SectionHeaderProps) {
  return (
    <tr className="border-b border-gray-200">
      <th colSpan={2} className="py-2 px-4 text-left font-bold text-gray-800 bg-gray-100">
        {title}
      </th>
    </tr>
  );
}

export function SummarySection({ summaryData }: SummarySectionProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white">収支総括表 (SYUUSHI07_02)</h2>

      <div className="bg-white border border-black overflow-hidden">
        <table className="w-full">
          <tbody>
            <SectionHeader title="【収支総括】" />
            <SummaryRow label="収入総額" value={formatCurrency(summaryData.syunyuSgk)} />
            <SummaryRow label="前年繰越額" value={formatCurrency(summaryData.zennenKksGk)} />
            <SummaryRow label="本年収入額" value={formatCurrency(summaryData.honnenSyunyuGk)} />
            <SummaryRow label="支出総額" value={formatCurrency(summaryData.sisyutuSgk)} />
            <SummaryRow label="翌年繰越額" value={formatCurrency(summaryData.yokunenKksGk)} />

            <SectionHeader title="【寄附の内訳】" />
            <SummaryRow label="個人寄附" value={formatCurrency(summaryData.kojinKifuGk)} />
            <SummaryRow label="法人寄附" value={formatNullableCurrency(summaryData.hojinKifuGk)} />
            <SummaryRow
              label="政治団体寄附"
              value={formatNullableCurrency(summaryData.seijiKifuGk)}
            />
            <SummaryRow label="寄附小計" value={formatCurrency(summaryData.kifuSkeiGk)} />
            <SummaryRow label="寄附合計" value={formatCurrency(summaryData.kifuGkeiGk)} />
          </tbody>
        </table>
      </div>
    </div>
  );
}
