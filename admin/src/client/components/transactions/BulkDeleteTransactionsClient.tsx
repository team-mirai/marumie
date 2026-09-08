"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { PoliticalOrganization } from "@/shared/models/political-organization";
import { PoliticalOrganizationSelect } from "@/client/components/political-organizations/PoliticalOrganizationSelect";
import { PageHeader } from "@/client/components/layout/PageHeader";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/client/components/ui";
import { bulkDeleteTransactionsAction } from "@/server/contexts/data-import/presentation/actions/bulk-delete-transactions";
import type { BulkDeleteSearchResult } from "@/server/contexts/data-import/presentation/types";

export function BulkDeleteTransactionsClient({
  organizations,
}: {
  organizations: PoliticalOrganization[];
}) {
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [transactionNosInput, setTransactionNosInput] = useState("");
  const [searchResult, setSearchResult] = useState<BulkDeleteSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleSearch = async () => {
    if (!selectedOrgId || !transactionNosInput.trim()) return;

    const nos = transactionNosInput
      .split(",")
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    if (nos.length === 0) return;

    setIsSearching(true);
    setSearchResult(null);

    const params = new URLSearchParams({
      orgId: selectedOrgId,
      nos: nos.join(","),
    });
    const response = await fetch(`/api/transactions/search-by-nos?${params}`);
    const result: BulkDeleteSearchResult = await response.json();
    setSearchResult(result);
    setIsSearching(false);
  };

  const handleDelete = async () => {
    if (!searchResult?.foundTransactions?.length) return;

    setIsDeleting(true);
    const ids = searchResult.foundTransactions.map((t) => t.id);
    const result = await bulkDeleteTransactionsAction(ids);
    setShowConfirmDialog(false);
    setIsDeleting(false);

    if (result.success) {
      toast.success(`${result.deletedCount}件の取引を削除しました。`);
      setSearchResult(null);
      setTransactionNosInput("");
    } else {
      toast.error(`削除に失敗しました: ${result.error}`);
    }
  };

  return (
    <div>
      <PageHeader label="Bulk Delete" title="取引一括削除" />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>検索条件</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <PoliticalOrganizationSelect
              organizations={organizations}
              value={selectedOrgId}
              onValueChange={(value) => {
                setSelectedOrgId(value);
                setSearchResult(null);
              }}
              required
            />

            <div className="space-y-2">
              <Label>取引番号（カンマ区切り）</Label>
              <Input
                placeholder="例: 1,5,8,20"
                value={transactionNosInput}
                onChange={(e) => setTransactionNosInput(e.target.value)}
              />
            </div>

            <Button
              onClick={handleSearch}
              disabled={!selectedOrgId || !transactionNosInput.trim() || isSearching}
            >
              {isSearching ? "検索中..." : "検索"}
            </Button>
          </CardContent>
        </Card>

        {searchResult && !searchResult.success && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-red-600 font-medium">エラー: {searchResult.error}</p>
            </CardContent>
          </Card>
        )}

        {searchResult?.success && (
          <>
            {searchResult.notFoundNos && searchResult.notFoundNos.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-amber-600">
                    該当なし ({searchResult.notFoundNos.length}件)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    以下の取引番号は見つかりませんでした:{" "}
                    <span className="font-mono">{searchResult.notFoundNos.join(", ")}</span>
                  </p>
                </CardContent>
              </Card>
            )}

            {searchResult.foundTransactions && searchResult.foundTransactions.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>削除対象 ({searchResult.foundTransactions.length}件)</CardTitle>
                  <Button variant="destructive" onClick={() => setShowConfirmDialog(true)}>
                    削除
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>取引番号</TableHead>
                        <TableHead>取引日</TableHead>
                        <TableHead>摘要</TableHead>
                        <TableHead className="text-right">借方金額</TableHead>
                        <TableHead className="text-right">貸方金額</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {searchResult.foundTransactions.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-mono">{t.transactionNo}</TableCell>
                          <TableCell>{t.transactionDate}</TableCell>
                          <TableCell>{t.description}</TableCell>
                          <TableCell className="text-right">
                            {t.debitAmount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {t.creditAmount.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {searchResult.foundTransactions?.length === 0 &&
              searchResult.notFoundNos?.length === 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-muted-foreground">該当する取引はありません。</p>
                  </CardContent>
                </Card>
              )}
          </>
        )}

        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>取引の一括削除</DialogTitle>
              <DialogDescription>
                {searchResult?.foundTransactions?.length}
                件の取引を削除します。この操作は取り消せません。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                キャンセル
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? "削除中..." : "削除する"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
