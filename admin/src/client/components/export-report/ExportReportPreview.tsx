"use client";
import "client-only";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/client/components/ui";
import type { ReportData } from "@/server/contexts/report/domain/models/report-data";
import type { SummaryData } from "@/server/contexts/report/domain/models/summary-data";
import { ReportDataPreview } from "@/client/components/export-report/ReportDataPreview";
import { XmlPreview } from "@/client/components/export-report/XmlPreview";

interface ExportReportPreviewProps {
  xml: string;
  reportData: ReportData;
  summaryData: SummaryData;
}

/** アクティブタブを teal 系（teal-100 背景 + teal-deep 文字・枠）で示す */
const ACTIVE_TAB_CLASS =
  "data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:border-primary-active";

export function ExportReportPreview({ xml, reportData, summaryData }: ExportReportPreviewProps) {
  return (
    <Tabs defaultValue="table" className="w-full gap-4">
      <TabsList>
        <TabsTrigger value="table" className={ACTIVE_TAB_CLASS}>
          表形式プレビュー
        </TabsTrigger>
        <TabsTrigger value="xml" className={ACTIVE_TAB_CLASS}>
          XMLプレビュー
        </TabsTrigger>
      </TabsList>
      <TabsContent value="table">
        <ReportDataPreview reportData={reportData} summaryData={summaryData} />
      </TabsContent>
      <TabsContent value="xml">
        <XmlPreview xml={xml} />
      </TabsContent>
    </Tabs>
  );
}
