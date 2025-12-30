"use client";
import "client-only";

import { useState } from "react";
import type { DonorWithUsage } from "@/server/contexts/report/domain/models/donor";
import { DONOR_TYPE_LABELS } from "@/server/contexts/report/domain/models/donor";
import { Button } from "@/client/components/ui";
import { DonorFormDialog } from "./DonorFormDialog";
import { DeleteDonorButton } from "./DeleteDonorButton";

interface DonorTableProps {
  donors: DonorWithUsage[];
  onUpdate: () => void;
}

export function DonorTable({ donors, onUpdate }: DonorTableProps) {
  const [editingDonor, setEditingDonor] = useState<DonorWithUsage | null>(null);

  if (donors.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">寄付者が登録されていません</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-muted-foreground font-medium">種別</th>
              <th className="text-left py-3 px-4 text-muted-foreground font-medium">名前</th>
              <th className="text-left py-3 px-4 text-muted-foreground font-medium">住所</th>
              <th className="text-left py-3 px-4 text-muted-foreground font-medium">職業</th>
              <th className="text-right py-3 px-4 text-muted-foreground font-medium">使用数</th>
              <th className="text-right py-3 px-4 text-muted-foreground font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {donors.map((donor) => (
              <tr
                key={donor.id}
                className="border-b border-border hover:bg-secondary/30 transition-colors"
              >
                <td className="py-3 px-4 text-white">
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-secondary">
                    {DONOR_TYPE_LABELS[donor.donorType]}
                  </span>
                </td>
                <td className="py-3 px-4 text-white">{donor.name}</td>
                <td className="py-3 px-4 text-white">{donor.address ?? "-"}</td>
                <td className="py-3 px-4 text-white">
                  {donor.donorType === "individual" ? (donor.occupation ?? "-") : "-"}
                </td>
                <td className="py-3 px-4 text-white text-right">{donor.usageCount}件</td>
                <td className="py-3 px-4 text-right">
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
