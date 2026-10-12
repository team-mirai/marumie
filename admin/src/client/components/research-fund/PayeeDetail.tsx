import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { PayeeAliasDeleteButton } from "@/client/components/research-fund/PayeeAliasDeleteButton";
import { PayeeEditButton } from "@/client/components/research-fund/PayeeEditButton";
import {
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui";
import { cn, formatDateTime } from "@/client/lib";
import type { Payee, PayeeJournalEntry } from "@/server/contexts/research-fund/domain/models/payee";
import type { PayeeAlias } from "@/server/contexts/research-fund/domain/models/payee-alias";
import type { AdminTarget } from "@/server/contexts/shared/domain/models/admin-target";

const statuses: Record<PayeeJournalEntry["status"], string> = {
  draft: "下書き",
  approved: "確認済",
  published: "公開中",
};

const aliasSources: Record<PayeeAlias["source"], string> = {
  manual: "手動",
  rule: "ルール",
  ai: "AI",
};

function Unset() {
  return <span className="text-muted-foreground">未入力</span>;
}

/**
 * 支払先（支出を受けた者）の詳細。支払先の情報と、選択中の帳簿でその支払先に紐づいた仕訳を表示する。
 * 紐づけの誤りを見つけるための画面で、仕訳の編集や支払先の付け替えは仕訳の確認画面で行う。
 * 書類との照合に使う表記（紐づけの操作から自動で記録される）も表示し、誤った表記はここで削除する。
 */
export function PayeeDetail({
  payee,
  entries,
  aliases,
  target,
}: {
  payee: Payee;
  entries: readonly PayeeJournalEntry[];
  aliases: readonly PayeeAlias[];
  target: Extract<AdminTarget, { kind: "research-fund" }>;
}) {
  return (
    <>
      <div className="mb-2.5">
        <Link
          href={`/politicians/${target.politicianId}/books/${target.bookId}/payees`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-active hover:underline"
        >
          <CaretLeft size={13} />
          支払先の一覧に戻る
        </Link>
      </div>
      <PageHeader
        label="Payee"
        title={payee.name}
        description="支払先を編集すると、紐づけたすべての仕訳に反映されます。"
        actions={<PayeeEditButton payee={payee} usageCount={entries.length} target={target} />}
      />
      <Card className="mb-6">
        <CardContent className="p-6">
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[max-content_1fr]">
            <dt className="font-bold">名称</dt>
            <dd>{payee.name}</dd>
            <dt className="font-bold">郵便番号</dt>
            <dd className="font-latin">{payee.postalCode ?? <Unset />}</dd>
            <dt className="font-bold">住所</dt>
            <dd>{payee.address || <Unset />}</dd>
            <dt className="font-bold">インボイス登録番号</dt>
            <dd className="font-latin">{payee.invoiceRegistrationNumber ?? <Unset />}</dd>
          </dl>
        </CardContent>
      </Card>
      <h2 className="mb-1 text-base font-bold">
        書類上の表記（<span className="font-latin">{aliases.length}</span>件）
      </h2>
      <p className="mb-3 text-xs text-muted-foreground">
        書類のある仕訳にこの支払先を紐づけると、書類から読み取った発行元の名称が記録されます。スキャンした書類の発行元が支払先の名称かここに並ぶ表記に一致すると、この支払先に紐づきます。
      </p>
      <Card className="mb-6">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>表記</TableHead>
                <TableHead>記録の経路</TableHead>
                <TableHead>最初の書類</TableHead>
                <TableHead>記録日時</TableHead>
                <TableHead>
                  <span className="sr-only">操作</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aliases.map((alias) => (
                <TableRow key={alias.id}>
                  <TableCell>
                    <p>{alias.name}</p>
                    {alias.sharedWith.length > 0 && (
                      <p className="mt-1 text-xs text-destructive">
                        {alias.sharedWith.map((other) => `「${other.name}」`).join("")}
                        にも同じ表記があるため、この表記では自動で紐づけません
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{aliasSources[alias.source]}</TableCell>
                  <TableCell>
                    {alias.document ? (
                      alias.document.originalFilename
                    ) : (
                      <span className="text-muted-foreground">削除済み</span>
                    )}
                  </TableCell>
                  <TableCell className="font-latin whitespace-nowrap">
                    {formatDateTime(alias.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <PayeeAliasDeleteButton
                      payeeId={payee.id}
                      aliasId={alias.id}
                      name={alias.name}
                      target={target}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {aliases.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="p-8 text-center text-muted-foreground">
                    記録された表記はありません。
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <h2 className="mb-3 text-base font-bold">
        {target.name}の帳簿で紐づいている仕訳（<span className="font-latin">{entries.length}</span>
        件）
      </h2>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>日付</TableHead>
                <TableHead>項目名</TableHead>
                <TableHead className="text-right">金額</TableHead>
                <TableHead>状態</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-latin whitespace-nowrap">{entry.entryDate}</TableCell>
                  <TableCell>{entry.description}</TableCell>
                  <TableCell className="text-right font-latin whitespace-nowrap">
                    ¥{entry.amount.toLocaleString("ja-JP")}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "whitespace-nowrap rounded-full border px-2 py-1 text-xs",
                        entry.status === "draft"
                          ? "bg-background text-muted-foreground"
                          : "bg-accent text-accent-foreground",
                      )}
                    >
                      {statuses[entry.status]}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {entries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="p-8 text-center text-muted-foreground">
                    この帳簿には、この支払先に紐づいている仕訳はありません。
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
