"use client";
import "client-only";

import { useId, useState, useEffect } from "react";
import type { PoliticalOrganization } from "@/shared/models/political-organization";
import { Button, Input, Label } from "@/client/components/ui";
import { PoliticalOrganizationSelect } from "@/client/components/political-organizations/PoliticalOrganizationSelect";
import CsvPreview from "@/client/components/csv-import/CsvPreview";
import type { PreviewMfCsvResult } from "@/server/contexts/data-import/application/usecases/preview-mf-csv-usecase";
import type {
  UploadCsvRequest,
  UploadCsvResponse,
} from "@/server/contexts/data-import/presentation/actions/upload-csv";
import type { PreviewCsvRequest } from "@/server/contexts/data-import/presentation/actions/preview-csv";

interface CsvUploadClientProps {
  organizations: PoliticalOrganization[];
  uploadAction: (data: UploadCsvRequest) => Promise<UploadCsvResponse>;
  previewAction: (data: PreviewCsvRequest) => Promise<PreviewMfCsvResult>;
}

export default function CsvUploadClient({
  organizations,
  uploadAction,
  previewAction,
}: CsvUploadClientProps) {
  const csvFileInputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [politicalOrganizationId, setPoliticalOrganizationId] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [errors, setErrors] = useState<string[]>([]);
  const [hasError, setHasError] = useState<boolean>(false);
  const [uploading, setUploading] = useState(false);
  const [previewResult, setPreviewResult] = useState<PreviewMfCsvResult | null>(null);

  // 最初の組織を自動選択
  useEffect(() => {
    if (organizations.length > 0 && !politicalOrganizationId) {
      setPoliticalOrganizationId(organizations[0].id);
    }
  }, [organizations, politicalOrganizationId]);

  const handlePreviewComplete = (result: PreviewMfCsvResult) => {
    setPreviewResult(result);
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !politicalOrganizationId) return;
    setUploading(true);
    setMessage("");
    setErrors([]);
    setHasError(false);

    try {
      if (!previewResult) {
        setMessage("Preview data not available");
        setHasError(true);
        return;
      }

      const validTransactions = previewResult.transactions.filter(
        (t) => t.status === "insert" || t.status === "update",
      );
      if (validTransactions.length === 0) {
        setMessage("保存可能なデータがありません");
        setHasError(true);
        return;
      }

      const result = await uploadAction({
        validTransactions,
        politicalOrganizationId,
      });

      if (!result.ok && result.errors && result.errors.length > 0) {
        setMessage(result.message);
        setErrors(result.errors);
        setHasError(true);
        return;
      }

      const uploadedFileName = file.name;
      const serverMessage =
        result.message ||
        `Successfully processed ${result.processedCount} records and saved ${result.savedCount} transactions`;

      setMessage(`"${uploadedFileName}" の取り込み結果: ${serverMessage}`);

      setFile(null);
      setPreviewResult(null);

      const fileInput = document.getElementById(csvFileInputId) as HTMLInputElement;
      if (fileInput) {
        fileInput.value = "";
      }
    } catch (err) {
      console.error("Upload error:", err);
      setMessage(`Error: ${err instanceof Error ? err.message : String(err)}`);
      setHasError(true);
      // For admin interface, show stack trace
      if (err instanceof Error && err.stack) {
        setErrors([err.stack]);
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <PoliticalOrganizationSelect
        organizations={organizations}
        value={politicalOrganizationId}
        onValueChange={setPoliticalOrganizationId}
        required
      />
      <div>
        <Label htmlFor={csvFileInputId}>CSV File:</Label>
        <Input
          id={csvFileInputId}
          className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          required
        />
      </div>

      <CsvPreview
        file={file}
        politicalOrganizationId={politicalOrganizationId}
        onPreviewComplete={handlePreviewComplete}
        previewAction={previewAction}
      />

      {(() => {
        const isDisabled =
          !file ||
          !politicalOrganizationId ||
          !previewResult ||
          previewResult.summary.insertCount + previewResult.summary.updateCount === 0 ||
          uploading;

        return (
          <Button disabled={isDisabled} type="submit">
            {uploading ? "Processing…" : "このデータを保存する"}
          </Button>
        );
      })()}

      {message && (
        <div
          className={`mt-3 p-3 rounded border ${
            hasError
              ? "text-red-500 bg-red-900/20 border-red-900/30"
              : "text-green-500 bg-green-900/20 border-green-900/30"
          }`}
        >
          {message}
        </div>
      )}

      {errors.length > 0 && (
        <div className="mt-3 p-3 rounded border text-red-500 bg-red-900/20 border-red-900/30">
          <div className="font-semibold mb-2">エラー詳細:</div>
          {errors.map((error) => (
            <div key={error} className="mb-2 last:mb-0">
              <pre className="whitespace-pre-wrap text-xs font-mono bg-red-950/30 p-2 rounded overflow-x-auto">
                {error}
              </pre>
            </div>
          ))}
        </div>
      )}
    </form>
  );
}
