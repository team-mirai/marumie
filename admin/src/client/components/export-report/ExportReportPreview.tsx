"use client";
import "client-only";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/client/components/ui";
import type { ReportData } from "@/server/contexts/report/domain/models/report-data";
import { ReportDataPreview } from "@/client/components/export-report/ReportDataPreview";
import { XmlPreview } from "@/client/components/export-report/XmlPreview";

interface ExportReportPreviewProps {
  xml: string;
  reportData: ReportData;
}

export function ExportReportPreview({ xml, reportData }: ExportReportPreviewProps) {
  return (
    <Tabs defaultValue="table" className="w-full">
      <TabsList>
        <TabsTrigger value="table">表形式プレビュー</TabsTrigger>
        <TabsTrigger value="xml">XMLプレビュー</TabsTrigger>
      </TabsList>
      <TabsContent value="table">
        <ReportDataPreview reportData={reportData} />
      </TabsContent>
      <TabsContent value="xml">
        <XmlPreview xml={xml} />
      </TabsContent>
    </Tabs>
  );
}
