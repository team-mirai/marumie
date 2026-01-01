import type { PreviewDonorCsvSummary } from "@/server/contexts/report/domain/services/donor-csv-summary-calculator";

interface DonorCsvSummaryProps {
  summary: PreviewDonorCsvSummary;
}

export default function DonorCsvSummary({ summary }: DonorCsvSummaryProps) {
  return (
    <div className="bg-card/50 rounded-lg p-4 mb-4">
      <h4 className="text-sm font-medium text-white mb-3">サマリー</h4>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-white">{summary.total}</div>
          <div className="text-xs text-muted-foreground">全件数</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-500">{summary.valid}</div>
          <div className="text-xs text-muted-foreground">正常</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-500">{summary.invalid}</div>
          <div className="text-xs text-muted-foreground">エラー</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-500">{summary.transactionNotFound}</div>
          <div className="text-xs text-muted-foreground">取引なし</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-500">{summary.typeMismatch}</div>
          <div className="text-xs text-muted-foreground">種別不整合</div>
        </div>
      </div>
    </div>
  );
}
