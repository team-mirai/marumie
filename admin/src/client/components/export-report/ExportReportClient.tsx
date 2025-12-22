"use client";
import "client-only";

import { useMemo, useState, useTransition } from "react";
import type { PoliticalOrganization } from "@/shared/models/political-organization";
import {
  Button,
  Card,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/client/components/ui";
import { PoliticalOrganizationSelect } from "@/client/components/political-organizations/PoliticalOrganizationSelect";
import { exportXml } from "@/server/contexts/report/presentation/actions/export-xml";
import { apiClient } from "@/client/lib/api-client";
import type { ReportData } from "@/server/contexts/report/domain/models/report-data";
import { XmlPreview } from "./XmlPreview";
import { ReportDataPreview } from "./ReportDataPreview";

interface ExportReportClientProps {
  organizations: PoliticalOrganization[];
}

type StatusType = "success" | "error" | "info";

interface StatusMessage {
  type: StatusType;
  message: string;
}

interface PreviewData {
  xml: string;
  reportData: ReportData | null;
}

export function ExportReportClient({ organizations }: ExportReportClientProps) {
  const initialFinancialYear = useMemo(() => new Date().getFullYear().toString(), []);

  const [selectedOrganizationId, setSelectedOrganizationId] = useState(organizations[0]?.id ?? "");
  const [financialYear, setFinancialYear] = useState(initialFinancialYear);
  const [previewData, setPreviewData] = useState<PreviewData>({ xml: "", reportData: null });
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [isDownloading, startDownloadTransition] = useTransition();
  const [isPreviewing, setIsPreviewing] = useState(false);

  const canSubmit = Boolean(selectedOrganizationId && financialYear);

  async function handlePreview() {
    if (!canSubmit) {
      return;
    }

    setIsPreviewing(true);
    setStatus(null);

    try {
      const result = await exportXml({
        politicalOrganizationId: selectedOrganizationId,
        financialYear: Number.parseInt(financialYear, 10),
      });
      setPreviewData({ xml: result.xml, reportData: result.reportData });
      setStatus({ type: "success", message: "プレビューを更新しました" });
    } catch (error) {
      console.error(error);
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "不明なエラーが発生しました",
      });
    } finally {
      setIsPreviewing(false);
    }
  }

  function handleDownload() {
    if (!canSubmit) {
      return;
    }

    setStatus(null);
    startDownloadTransition(async () => {
      try {
        const { blob, filename } = await apiClient.downloadReport({
          politicalOrganizationId: selectedOrganizationId,
          financialYear,
          sections: ["SYUUSHI07_06"],
        });

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename || `marumie_xml_${selectedOrganizationId}_${financialYear}.xml`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        setStatus({
          type: "success",
          message: "XMLファイルをダウンロードしました",
        });
      } catch (error) {
        console.error(error);
        setStatus({
          type: "error",
          message: error instanceof Error ? error.message : "不明なエラーが発生しました",
        });
      }
    });
  }

  if (organizations.length === 0) {
    return (
      <p className="text-white">政治団体が登録されていません。先に政治団体を作成してください。</p>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="w-fit">
            <PoliticalOrganizationSelect
              organizations={organizations}
              value={selectedOrganizationId}
              onValueChange={setSelectedOrganizationId}
              required
            />
          </div>
          <div className="w-fit space-y-2">
            <Label>報告年 (西暦)</Label>
            <Input
              type="number"
              value={financialYear}
              onChange={(event) => setFinancialYear(event.target.value)}
              min={1900}
              max={2100}
              required
              className="w-24"
            />
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            onClick={handlePreview}
            disabled={!canSubmit || isPreviewing || isDownloading}
          >
            {isPreviewing ? "プレビュー生成中..." : "プレビュー"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleDownload}
            disabled={!canSubmit || isPreviewing || isDownloading}
          >
            {isDownloading ? "ダウンロード中..." : "Shift_JISでダウンロード"}
          </Button>
        </div>

        {status && (
          <div
            className={`rounded-lg px-3 py-2 ${
              status.type === "error"
                ? "bg-red-500/20 text-red-200"
                : status.type === "success"
                  ? "bg-green-500/20 text-green-200"
                  : "bg-secondary text-muted-foreground"
            }`}
          >
            {status.message}
          </div>
        )}
      </div>

      <Tabs defaultValue="table" className="w-full">
        <TabsList>
          <TabsTrigger value="table">表形式プレビュー</TabsTrigger>
          <TabsTrigger value="xml">XMLプレビュー</TabsTrigger>
        </TabsList>
        <TabsContent value="table">
          {previewData.reportData ? (
            <ReportDataPreview reportData={previewData.reportData} />
          ) : (
            <div className="text-muted-foreground p-4">
              プレビューを生成すると表形式で確認できます。
            </div>
          )}
        </TabsContent>
        <TabsContent value="xml">
          <XmlPreview xml={previewData.xml} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
