import Link from "next/link";
import { Plus } from "@phosphor-icons/react/dist/ssr";
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
import type { PayeeSummary } from "@/server/contexts/research-fund/domain/models/payee";
import type { AdminTarget } from "@/server/contexts/shared/domain/models/admin-target";

/**
 * 議員の支払先（支出を受けた者）の一覧。
 * 支払先は議員ごとに持ち、年度帳簿をまたいで同じ支払先を使う。作成は作成ページ、編集は各支払先の詳細ページで行う。
 */
export function PayeeList({
  payees,
  target,
}: {
  payees: readonly PayeeSummary[];
  target: Extract<AdminTarget, { kind: "research-fund" }>;
}) {
  const base = `/politicians/${target.politicianId}/books/${target.bookId}/payees`;
  return (
    <>
      <PageHeader
        label="Payees"
        title="支払先"
        description={`${target.name}の支払先（支出を受けた者）です。議員課に提出する帳簿の氏名・住所に使います。編集すると、紐づけたすべての仕訳に反映されます。`}
        actions={
          <Button asChild>
            <Link href={`${base}/new`}>
              <Plus />
              支払先を追加
            </Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>郵便番号</TableHead>
                <TableHead>住所</TableHead>
                <TableHead>インボイス登録番号</TableHead>
                <TableHead className="text-right">仕訳（この帳簿）</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payees.map((payee) => (
                <TableRow key={payee.id}>
                  <TableCell className="font-bold">
                    <Link
                      href={`${base}/${payee.id}`}
                      className="text-primary-active hover:underline"
                    >
                      {payee.name}
                    </Link>
                  </TableCell>
                  <TableCell className="font-latin whitespace-nowrap">
                    {payee.postalCode ?? <span className="text-muted-foreground">未入力</span>}
                  </TableCell>
                  <TableCell>
                    {payee.address || <span className="text-muted-foreground">未入力</span>}
                  </TableCell>
                  <TableCell className="font-latin whitespace-nowrap">
                    {payee.invoiceRegistrationNumber ?? (
                      <span className="text-muted-foreground">未入力</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-latin">{payee.usageCount}</TableCell>
                </TableRow>
              ))}
              {payees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="p-8 text-center text-muted-foreground">
                    支払先はまだありません。「支払先を追加」か、仕訳の確認画面から作成できます。
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
