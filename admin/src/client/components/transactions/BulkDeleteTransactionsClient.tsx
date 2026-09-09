"use client";
import "client-only";

import { useId, useState } from "react";
import { CircleNotch, MagnifyingGlass, Trash } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import type { PoliticalOrganization } from "@/shared/models/political-organization";
import { PoliticalOrganizationSelect } from "@/client/components/political-organizations/PoliticalOrganizationSelect";
import { PageHeader } from "@/client/components/layout/PageHeader";
import {
  Button,
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
import { formatAmount, formatDate } from "@/client/lib";
import { bulkDeleteTransactionsAction } from "@/server/contexts/data-import/presentation/actions/bulk-delete-transactions";
import type { BulkDeleteSearchResult } from "@/server/contexts/data-import/presentation/types";

export function BulkDeleteTransactionsClient({
  organizations,
}: {
  organizations: PoliticalOrganization[];
}) {
  const transactionNosInputId = useId();
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [transactionNosInput, setTransactionNosInput] = useState("");
  const [searchResult, setSearchResult] = useState<BulkDeleteSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const foundTransactions = searchResult?.success ? (searchResult.foundTransactions ?? []) : [];
  const notFoundNos = searchResult?.success ? (searchResult.notFoundNos ?? []) : [];

  return (
    <div>
      <PageHeader label="Bulk Delete" title="取引一括削除" />

      <div className="space-y-6">
        <form
          onSubmit={handleSearch}
          className="max-w-[720px] rounded-lg border border-border bg-card p-7"
        >
          <h2 className="text-base font-bold text-foreground">検索条件</h2>
          <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>
                政治団体 <span className="text-destructive">*</span>
              </Label>
              <PoliticalOrganizationSelect
                organizations={organizations}
                value={selectedOrgId}
                onValueChange={(value) => {
                  setSelectedOrgId(value);
                  setSearchResult(null);
                }}
                required
                hideLabel
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={transactionNosInputId}>
                取引番号（カンマ区切り） <span className="text-destructive">*</span>
              </Label>
              <Input
                id={transactionNosInputId}
                placeholder="例: 1,5,8,20"
                value={transactionNosInput}
                onChange={(e) => setTransactionNosInput(e.target.value)}
                className="border-[1.5px] font-latin text-[13px]"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              type="submit"
              variant="outline"
              className="text-[13px]"
              disabled={!selectedOrgId || !transactionNosInput.trim() || isSearching}
            >
              {isSearching ? (
                <>
                  <CircleNotch aria-hidden className="animate-spin" />
                  検索中...
                </>
              ) : (
                <>
                  <MagnifyingGlass aria-hidden />
                  検索
                </>
              )}
            </Button>
          </div>
        </form>

        {searchResult && !searchResult.success && (
          <div
            role="alert"
            className="max-w-[720px] rounded-lg border border-destructive bg-destructive-hover p-4 text-sm text-destructive"
          >
            エラー: {searchResult.error}
          </div>
        )}

        {searchResult?.success && (
          <>
            {notFoundNos.length > 0 && (
              <div className="max-w-[720px] rounded-lg border border-border bg-card p-6">
                <h2 className="text-base font-bold text-foreground">
                  該当なし <span className="font-latin">({notFoundNos.length}件)</span>
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  以下の取引番号は見つかりませんでした:{" "}
                  <span className="font-latin text-foreground">{notFoundNos.join(", ")}</span>
                </p>
              </div>
            )}

            {foundTransactions.length > 0 && (
              <div className="rounded-lg border border-border bg-card p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-base font-bold text-foreground">
                    削除対象 <span className="font-latin">({foundTransactions.length}件)</span>
                  </h2>
                  <Button
                    type="button"
                    variant="destructive"
                    className="text-[13px]"
                    onClick={() => setShowConfirmDialog(true)}
                  >
                    <Trash aria-hidden />
                    削除
                  </Button>
                </div>
                <div className="mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>取引番号</TableHead>
                        <TableHead>取引日</TableHead>
                        <TableHead>摘要</TableHead>
                        <TableHead className="text-right">借方金額</TableHead>
                        <TableHead className="text-right">貸方金額</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {foundTransactions.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-latin text-xs text-muted-foreground">
                            {t.transactionNo}
                          </TableCell>
                          <TableCell className="font-latin text-[13px]">
                            {formatDate(t.transactionDate)}
                          </TableCell>
                          <TableCell className="max-w-[200px] text-xs text-muted-foreground">
                            <div className="truncate" title={t.description || undefined}>
                              {t.description || "-"}
                            </div>
                          </TableCell>
                          <TableCell className="font-latin text-right text-[13px] font-semibold">
                            {formatAmount(t.debitAmount)}
                          </TableCell>
                          <TableCell className="font-latin text-right text-[13px] font-semibold">
                            {formatAmount(t.creditAmount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {foundTransactions.length === 0 && notFoundNos.length === 0 && (
              <div className="max-w-[720px] rounded-lg border border-border bg-card px-6 py-8 text-center">
                <p className="text-sm text-muted-foreground">該当する取引はありません。</p>
              </div>
            )}
          </>
        )}

        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>取引の一括削除</DialogTitle>
              <DialogDescription>
                <span className="font-latin">{foundTransactions.length}</span>
                件の取引を削除します。この操作は取り消せません。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
                disabled={isDeleting}
              >
                キャンセル
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <CircleNotch aria-hidden className="animate-spin" />
                    削除中...
                  </>
                ) : (
                  "削除する"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
