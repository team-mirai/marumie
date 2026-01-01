"use client";
import "client-only";

import { useEffect, useRef, useState } from "react";
import type { PoliticalOrganization } from "@/shared/models/political-organization";
import type { PreviewDonorCsvResult } from "@/server/contexts/report/presentation/types/preview-donor-csv-types";
import type { PreviewDonorCsvRequest } from "@/server/contexts/report/presentation/actions/preview-donor-csv";
import DonorCsvPreview from "./DonorCsvPreview";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui";

interface DonorCsvImportClientProps {
  organizations: PoliticalOrganization[];
  previewAction: (data: PreviewDonorCsvRequest) => Promise<PreviewDonorCsvResult>;
}

export default function DonorCsvImportClient({
  organizations,
  previewAction,
}: DonorCsvImportClientProps) {
  const [file, setFile] = useState<File | null>(null);
  const [politicalOrganizationId, setPoliticalOrganizationId] = useState<string>("");
  const [previewResult, setPreviewResult] = useState<PreviewDonorCsvResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        const result = await previewAction({
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
  }, [file, politicalOrganizationId, previewAction]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
  };

  const handleOrganizationChange = (value: string) => {
    setPoliticalOrganizationId(value);
  };

  const handleClearFile = () => {
    setFile(null);
    setPreviewResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="organization" className="text-white mb-2 block">
            政治団体
          </Label>
          <Select value={politicalOrganizationId} onValueChange={handleOrganizationChange}>
            <SelectTrigger id="organization" className="w-full">
              <SelectValue placeholder="政治団体を選択" />
            </SelectTrigger>
            <SelectContent>
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="file" className="text-white mb-2 block">
            CSVファイル
          </Label>
          <div className="flex gap-2">
            <Input
              ref={fileInputRef}
              id="file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="flex-1"
            />
            {file && (
              <Button type="button" variant="outline" onClick={handleClearFile}>
                クリア
              </Button>
            )}
          </div>
          {file && <p className="text-sm text-muted-foreground mt-1">選択中: {file.name}</p>}
        </div>
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

      {previewResult && !loading && (
        <div className="bg-card rounded-xl p-4">
          <h3 className="text-lg font-medium text-white mb-4">プレビュー結果</h3>
          <DonorCsvPreview result={previewResult} />
        </div>
      )}
    </div>
  );
}
