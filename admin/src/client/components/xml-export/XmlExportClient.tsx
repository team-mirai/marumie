"use client";
import "client-only";

import { useMemo, useState, useTransition } from "react";
import type { PoliticalOrganization } from "@/shared/models/political-organization";
import Card from "@/client/components/ui/Card";
import Button from "@/client/components/ui/Button";
import Input from "@/client/components/ui/Input";
import Selector from "@/client/components/ui/Selector";

interface XmlExportClientProps {
  organizations: PoliticalOrganization[];
}

type StatusType = "success" | "error" | "info";

interface StatusMessage {
  type: StatusType;
  message: string;
}

export function XmlExportClient({ organizations }: XmlExportClientProps) {
  const initialFinancialYear = useMemo(
    () => new Date().getFullYear().toString(),
    [],
  );

  const [selectedOrganizationId, setSelectedOrganizationId] = useState(
    organizations[0]?.id ?? "",
  );
  const [financialYear, setFinancialYear] = useState(initialFinancialYear);
  const [previewXml, setPreviewXml] = useState("");
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [isDownloading, startDownloadTransition] = useTransition();
  const [isPreviewing, setIsPreviewing] = useState(false);

  const organizationOptions = organizations.map((organization) => ({
    value: organization.id,
    label: organization.displayName,
  }));

  const canSubmit = Boolean(selectedOrganizationId && financialYear);

  async function handlePreview() {
    if (!canSubmit) {
      return;
    }

    setIsPreviewing(true);
    setStatus(null);

    try {
      const params = new URLSearchParams({
        politicalOrganizationId: selectedOrganizationId,
        financialYear,
        mode: "preview",
      });
      const response = await fetch(
        `/api/xml/other-income?${params.toString()}`,
      );
      if (!response.ok) {
        throw new Error("XML取得に失敗しました");
      }
      const data = (await response.json()) as { xml: string };
      setPreviewXml(data.xml);
      setStatus({ type: "success", message: "プレビューを更新しました" });
    } catch (error) {
      console.error(error);
      setStatus({
        type: "error",
        message:
          error instanceof Error ? error.message : "不明なエラーが発生しました",
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
        const params = new URLSearchParams({
          politicalOrganizationId: selectedOrganizationId,
          financialYear,
        });

        const response = await fetch(
          `/api/xml/other-income?${params.toString()}`,
        );

        if (!response.ok) {
          throw new Error("XMLダウンロードに失敗しました");
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const contentDisposition = response.headers.get("Content-Disposition");
        const filenameFromHeader =
          extractFilenameFromContentDisposition(contentDisposition);
        link.download =
          filenameFromHeader ||
          `marumie_xml_${selectedOrganizationId}_${financialYear}.xml`;
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
          message:
            error instanceof Error
              ? error.message
              : "不明なエラーが発生しました",
        });
      }
    });
  }

  if (organizations.length === 0) {
    return (
      <Card>
        <p className="text-white">
          政治団体が登録されていません。先に政治団体を作成してください。
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white mb-1">XML出力</h1>
        <p className="text-primary-muted">
          14号様式(その6)「その他の収入」のみ対応。XML出力タブ第1弾としてα版です。
        </p>
      </div>

      <Card className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Selector
            value={selectedOrganizationId}
            onChange={setSelectedOrganizationId}
            options={organizationOptions}
            label="政治団体"
            required
          />
          <Input
            type="number"
            label="報告年 (西暦)"
            value={financialYear}
            onChange={(event) => setFinancialYear(event.target.value)}
            min="1900"
            max="2100"
            required
          />
        </div>

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
                  : "bg-primary-hover text-primary-muted"
            }`}
          >
            {status.message}
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <div>
          <h2 className="text-lg font-medium text-white mb-1">XMLプレビュー</h2>
          <p className="text-sm text-primary-muted">
            プレビューはUTF-8で表示しています。実際のファイルはShift_JISで出力されます。
          </p>
        </div>
        <pre className="bg-black/30 rounded-lg p-4 text-sm overflow-auto max-h-[420px] whitespace-pre-wrap text-primary-muted">
          {previewXml || "プレビューを生成するとここにXMLが表示されます。"}
        </pre>
      </Card>
    </div>
  );
}

function extractFilenameFromContentDisposition(
  contentDisposition: string | null,
) {
  if (!contentDisposition) {
    return null;
  }

  const filenameStarMatch = contentDisposition.match(
    /filename\*\s*=\s*UTF-8''([^;]+)/i,
  );
  if (filenameStarMatch && filenameStarMatch[1]) {
    try {
      return decodeURIComponent(filenameStarMatch[1]);
    } catch {
      // ignore decoding errors and continue to fallback
    }
  }

  const filenameMatch = contentDisposition.match(/filename\s*=\s*"([^"]+)"/i);
  if (filenameMatch && filenameMatch[1]) {
    return filenameMatch[1];
  }

  return null;
}
