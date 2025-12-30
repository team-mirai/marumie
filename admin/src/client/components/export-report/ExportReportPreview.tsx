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

export function ExportReportPreview({ xml, reportData, summaryData }: ExportReportPreviewProps) {
  return (
    <Tabs defaultValue="table" className="w-full">
      <TabsList>
        <TabsTrigger value="table">表形式プレビュー</TabsTrigger>
        <TabsTrigger value="xml">XMLプレビュー</TabsTrigger>
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
