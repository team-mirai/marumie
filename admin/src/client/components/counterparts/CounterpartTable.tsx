"use client";
import "client-only";

import { useState } from "react";
import Link from "next/link";
import type { CounterpartWithUsage } from "@/server/contexts/report/domain/models/counterpart";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui";
import { CounterpartFormDialog } from "@/client/components/counterparts/CounterpartFormDialog";
import { DeleteCounterpartButton } from "@/client/components/counterparts/DeleteCounterpartButton";

interface CounterpartTableProps {
  counterparts: CounterpartWithUsage[];
  onUpdate: () => void;
}

/**
 * 取引先マスタの一覧テーブル。
 * 罫線は取引一覧と同じ（ヘッダー下黒 1.5px・行 #E5E5E5）。名前はリンク、使用数は Poppins 右寄せ、
 * 操作列は「編集」黒枠 / 「削除」赤枠の小ピル（ハンドオフ「4. 取引先マスタ」）。
 */
export function CounterpartTable({ counterparts, onUpdate }: CounterpartTableProps) {
  const [editingCounterpart, setEditingCounterpart] = useState<CounterpartWithUsage | null>(null);

  if (counterparts.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-muted-foreground">取引先が登録されていません</p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>名前</TableHead>
            <TableHead>住所</TableHead>
            <TableHead className="text-right">使用数</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {counterparts.map((counterpart) => (
            <TableRow key={counterpart.id}>
              <TableCell className="whitespace-normal">
                <Link
                  href={`/counterparts/${counterpart.id}`}
                  className="text-[13px] font-semibold text-primary-active transition-colors duration-150 ease-out hover:text-primary-hover hover:underline"
                >
                  {counterpart.name}
                </Link>
              </TableCell>
              <TableCell className="whitespace-normal text-[13px] text-muted-foreground">
                {counterpart.address}
              </TableCell>
              <TableCell className="font-latin text-right text-[13px] font-semibold text-foreground">
                {counterpart.usageCount}件
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => setEditingCounterpart(counterpart)}
                  >
                    編集
                  </Button>
                  <DeleteCounterpartButton
                    counterpartId={counterpart.id}
                    counterpartName={counterpart.name}
                    usageCount={counterpart.usageCount}
                    onDelete={onUpdate}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {editingCounterpart && (
        <CounterpartFormDialog
          mode="edit"
          counterpart={editingCounterpart}
          onClose={() => setEditingCounterpart(null)}
          onSuccess={() => {
            setEditingCounterpart(null);
            onUpdate();
          }}
        />
      )}
    </>
  );
}
