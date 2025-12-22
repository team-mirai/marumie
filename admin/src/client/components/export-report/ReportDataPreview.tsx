"use client";

import type { ReportData } from "@/server/contexts/report/domain/models/report-data";
import { RegularExpenseSection } from "./sections/RegularExpenseSection";

interface ReportDataPreviewProps {
  reportData: ReportData;
}

export function ReportDataPreview({ reportData }: ReportDataPreviewProps) {
  const { expenses } = reportData;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-medium text-white mb-1">表形式プレビュー</h2>
        <p className="text-sm text-muted-foreground">報告書データを表形式で確認できます。</p>
      </div>

      <div className="space-y-8">
        <RegularExpenseSection
          utilityExpenses={expenses.utilityExpenses}
          suppliesExpenses={expenses.suppliesExpenses}
          officeExpenses={expenses.officeExpenses}
        />
      </div>
    </div>
  );
}
