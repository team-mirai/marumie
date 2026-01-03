"use client";
import "client-only";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { PoliticalOrganization } from "@/shared/models/political-organization";
import type { PreviewDonorCsvResult } from "@/server/contexts/report/presentation/types/preview-donor-csv-types";
import type { PreviewDonorCsvRequest } from "@/server/contexts/report/presentation/actions/preview-donor-csv";
import DonorCsvPreview from "./DonorCsvPreview";
import { Input, Label } from "@/client/components/ui";
import { PoliticalOrganizationSelect } from "@/client/components/political-organizations/PoliticalOrganizationSelect";

interface DonorCsvImportClientProps {
  organizations: PoliticalOrganization[];
  previewAction: (data: PreviewDonorCsvRequest) => Promise<PreviewDonorCsvResult>;
}

export default function DonorCsvImportClient({
  organizations,
  previewAction,
}: DonorCsvImportClientProps) {
  const csvFileInputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [politicalOrganizationId, setPoliticalOrganizationId] = useState<string>("");
  const [previewResult, setPreviewResult] = useState<PreviewDonorCsvResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewActionRef = useRef(previewAction);

  // 最初の組織を自動選択
  useEffect(() => {
    if (organizations.length > 0 && !politicalOrganizationId) {
      setPoliticalOrganizationId(organizations[0].id);
    }
  }, [organizations, politicalOrganizationId]);

  useEffect(() => {
    previewActionRef.current = previewAction;
  }, [previewAction]);

  const stablePreviewAction = useCallback(
    (data: PreviewDonorCsvRequest) => previewActionRef.current(data),
    [],
  );

  useEffect(() => {
    if (!file || !politicalOrganizationId) {
      setPreviewResult(null);
      setError(null);
      return;
    }

    const previewFile = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await stablePreviewAction({
          file,
          politicalOrganizationId,
        });
        setPreviewResult(result);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "CSVのプレビューに失敗しました";
        setError(errorMessage);
        setPreviewResult(null);
      } finally {
        setLoading(false);
      }
    };

    previewFile();
  }, [file, politicalOrganizationId, stablePreviewAction]);

  return (
    <div className="space-y-3">
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
          className="h-10 border-0 bg-transparent shadow-none file:mr-4 file:h-full file:px-6 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer"
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          required
        />
      </div>

      {loading && (
        <div className="bg-card/50 rounded-lg p-4">
          <p className="text-muted-foreground">ファイルを処理中...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/20 rounded-lg p-4">
          <p className="text-red-500">エラー: {error}</p>
        </div>
      )}

      {previewResult && !loading && <DonorCsvPreview result={previewResult} />}
    </div>
  );
}
