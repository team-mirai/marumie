"use client";
import "client-only";

import { useState } from "react";
import type { DonorWithUsage } from "@/server/contexts/report/domain/models/donor";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui";
import { DonorFormDialog } from "@/client/components/donors/DonorFormDialog";
import { DonorTypeBadge } from "@/client/components/donors/DonorTypeBadge";
import { DeleteDonorButton } from "@/client/components/donors/DeleteDonorButton";

interface DonorTableProps {
  donors: DonorWithUsage[];
  onUpdate: () => void;
}

/**
 * 寄付者マスタの一覧テーブル。取引先マスタと同じ語彙
 * （ヘッダー下黒 1.5px・行 #E5E5E5・使用数 Poppins 右寄せ・操作列は小ピル）。
 */
export function DonorTable({ donors, onUpdate }: DonorTableProps) {
  const [editingDonor, setEditingDonor] = useState<DonorWithUsage | null>(null);

  if (donors.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-muted-foreground">寄付者が登録されていません</p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>種別</TableHead>
            <TableHead>名前</TableHead>
            <TableHead>住所</TableHead>
            <TableHead>職業</TableHead>
            <TableHead className="text-right">使用数</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {donors.map((donor) => (
            <TableRow key={donor.id}>
              <TableCell>
                <DonorTypeBadge donorType={donor.donorType} />
              </TableCell>
              <TableCell className="whitespace-normal text-[13px] font-semibold text-foreground">
                {donor.name}
              </TableCell>
              <TableCell className="whitespace-normal text-[13px] text-muted-foreground">
                {donor.address ?? "-"}
              </TableCell>
              <TableCell className="whitespace-normal text-[13px] text-muted-foreground">
                {donor.donorType === "individual" ? (donor.occupation ?? "-") : "-"}
              </TableCell>
              <TableCell className="font-latin text-right text-[13px] font-semibold text-foreground">
                {donor.usageCount}件
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => setEditingDonor(donor)}
                  >
                    編集
                  </Button>
                  <DeleteDonorButton
                    donorId={donor.id}
                    donorName={donor.name}
                    usageCount={donor.usageCount}
                    onDelete={onUpdate}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {editingDonor && (
        <DonorFormDialog
          mode="edit"
          donor={editingDonor}
          onClose={() => setEditingDonor(null)}
          onSuccess={() => {
            setEditingDonor(null);
            onUpdate();
          }}
        />
      )}
    </>
  );
}
