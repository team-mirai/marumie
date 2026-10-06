import "server-only";
import Link from "next/link";
import { DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/client/components/layout/PageHeader";
import {
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui";
import {
  PARLIAMENT_HOUSE_LABELS,
  PARLIAMENT_HOUSES,
  SUBMISSION_LEDGER_ISSUE_LABELS,
} from "@/server/contexts/research-fund/domain/models/submission-ledger";
import { loadSubmissionLedger } from "@/server/contexts/research-fund/presentation/loaders/load-submission-ledger";

export default async function SubmissionLedgerPage({
  params,
}: {
  params: Promise<{ id: string; bookId: string }>;
}) {
  const { id, bookId } = await params;
  const { entryCount, financialYear, warnings, target } = await loadSubmissionLedger(id, bookId);
  const query = (house: string) =>
    new URLSearchParams({ politicianId: target.politicianId, house }).toString();
  return (
    <div className="space-y-4">
      <PageHeader
        label="Submission"
        title="議員課提出用の帳簿"
        description={`${target.name}の${financialYear}年度の帳簿を、衆議院・参議院の議員課の Excel と同じ列順の CSV でダウンロードします。公開済みの支出の仕訳（${entryCount}件）を 1 行ずつ出力します。`}
        actions={PARLIAMENT_HOUSES.map((house) => (
          <Button key={house} variant="outline" asChild>
            <a
              href={`/api/research-fund/books/${target.bookId}/submission-ledger?${query(house)}`}
              download
            >
              <DownloadSimple />
              {PARLIAMENT_HOUSE_LABELS[house]}のフォーマット
            </a>
          </Button>
        ))}
      />
      {warnings.length > 0 && (
        <Card className="border-destructive">
          <CardContent className="space-y-3">
            <h2 className="font-bold text-destructive">
              提出前に確認が必要な仕訳が{warnings.length}件あります
            </h2>
            <p className="text-sm text-muted-foreground">
              支払先が未設定の仕訳は氏名・住所が空欄になります。書類も徴し難かった事情もない仕訳は、
              <Link
                href={`/politicians/${target.politicianId}/books/${target.bookId}/entries`}
                className="text-primary-active underline"
              >
                仕訳の確認・編集
              </Link>
              で支払先や事情を入力してください。書類の領収書等番号が未採番の仕訳は、領収書等番号と領収書画像ファイル名が空欄になります。
              同じ画面の「領収書等番号を振る」で採番してください。
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日付</TableHead>
                  <TableHead>項目</TableHead>
                  <TableHead className="text-right">金額</TableHead>
                  <TableHead>不足している項目</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {warnings.map(({ entry, issues }) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-latin">
                      {entry.entryDate.replaceAll("-", ".")}
                    </TableCell>
                    <TableCell>{entry.description}</TableCell>
                    <TableCell className="text-right font-latin">
                      ¥{entry.amount.toLocaleString("ja-JP")}
                    </TableCell>
                    <TableCell className="text-destructive">
                      {issues.map((issue) => SUBMISSION_LEDGER_ISSUE_LABELS[issue]).join("、")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
