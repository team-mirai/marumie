"use client";
import Link from "next/link";
import { useId, useState } from "react";
import { toast } from "sonner";
import { FilePdf } from "@phosphor-icons/react";
import { Button, Card, CardContent, Label, Switch } from "@/client/components/ui";
import { saveBlobAsFile } from "@/client/lib/download-blob";
import type { ReceiptPrintItem } from "@/client/lib/research-fund-receipt-print";
import type { ReceiptPrintScope } from "@/server/contexts/research-fund/domain/models/receipt-print";

interface ReceiptPrintCount {
  readonly documentCount: number;
  readonly unnumberedCount: number;
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url, { referrerPolicy: "no-referrer" });
  if (!response.ok) throw new Error(`書類を取得できませんでした（${response.status}）`);
  return new Uint8Array(await response.arrayBuffer());
}

/**
 * 議員課への提出用に、領収書等番号を印字した領収書の印刷用 PDF を出力する（#1777）。
 * 数百件・数 MB の書類を結合した PDF は関数のレスポンス上限を超えるので、ブラウザで原本を取得して結合する
 */
export function ReceiptPrintPanel({
  target,
  counts,
}: {
  target: { politicianId: string; bookId: string };
  counts: Record<ReceiptPrintScope, ReceiptPrintCount>;
}) {
  const switchId = useId();
  const [overThresholdOnly, setOverThresholdOnly] = useState(true);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [failed, setFailed] = useState<readonly number[]>([]);
  const scope: ReceiptPrintScope = overThresholdOnly ? "over-threshold" : "all";
  const { documentCount, unnumberedCount } = counts[scope];

  const download = async () => {
    setFailed([]);
    setProgress({ done: 0, total: documentCount });
    try {
      const params = new URLSearchParams({ politicianId: target.politicianId, scope });
      const response = await fetch(
        `/api/research-fund/books/${target.bookId}/receipt-print?${params.toString()}`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error(await response.text());
      const manifest = (await response.json()) as {
        filename: string;
        receipts: ReceiptPrintItem[];
      };
      if (manifest.receipts.length === 0) {
        toast.error("出力できる書類がありません");
        return;
      }
      setProgress({ done: 0, total: manifest.receipts.length });
      // pdf-lib は大きいので、出力するときだけ読み込む
      const { buildReceiptPrintPdf } = await import("@/client/lib/research-fund-receipt-print");
      const result = await buildReceiptPrintPdf(manifest.receipts, fetchBytes, (done) =>
        setProgress({ done, total: manifest.receipts.length }),
      );
      saveBlobAsFile(
        new Blob([result.bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" }),
        manifest.filename,
      );
      setFailed(result.failedReceiptNumbers);
      if (result.failedReceiptNumbers.length > 0) {
        toast.error(
          `${result.failedReceiptNumbers.length}件の書類を読み込めませんでした。PDF には読めなかった旨のページを入れています`,
        );
      } else {
        toast.success("印刷用の PDF を出力しました");
      }
    } catch (error) {
      toast.error(
        error instanceof Error && error.message ? error.message : "PDF を出力できませんでした",
      );
    } finally {
      setProgress(null);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-3">
        <h2 className="font-bold">領収書の印刷用 PDF</h2>
        <p className="text-sm text-muted-foreground">
          公開済みの支出の仕訳が紐づく書類を、帳簿の CSV と同じ大項目 →
          日付の順に並べ、各ページの上端に領収書等番号を印字した A4 縦の PDF にします。CSV
          の「領収書等番号・徴難」（衆議院）の列と突き合わせられます。
          1万円超は、書類に紐づく仕訳の金額の合計で判定します。
        </p>
        <div className="flex items-center gap-2">
          <Switch
            id={switchId}
            checked={overThresholdOnly}
            disabled={progress !== null}
            onCheckedChange={setOverThresholdOnly}
          />
          <Label htmlFor={switchId}>1万円超に絞る</Label>
        </div>
        <p className="text-sm">
          出力される書類: <span className="font-latin font-bold">{documentCount}</span>件
        </p>
        {unnumberedCount > 0 && (
          <p className="text-sm text-destructive">
            領収書等番号が未採番の書類が{unnumberedCount}件あり、PDF には入りません。
            <Link
              href={`/politicians/${target.politicianId}/books/${target.bookId}/entries`}
              className="text-primary-active underline"
            >
              仕訳の確認・編集
            </Link>
            の「領収書等番号を振る」で採番してください。
          </p>
        )}
        {documentCount === 0 ? (
          <p className="text-sm text-muted-foreground">出力できる書類がありません。</p>
        ) : (
          <Button onClick={download} disabled={progress !== null}>
            <FilePdf />
            {progress === null
              ? "印刷用の PDF をダウンロード"
              : `PDF を作成中…（${progress.done} / ${progress.total}）`}
          </Button>
        )}
        {failed.length > 0 && (
          <p className="text-sm text-destructive">
            次の領収書等番号の書類を読み込めませんでした（PDF
            には読めなかった旨のページを入れています）。原本を開いて別に印刷してください:{" "}
            <span className="font-latin">{failed.join(", ")}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
