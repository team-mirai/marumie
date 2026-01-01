"use client";
import "client-only";

import { useState } from "react";
import Link from "next/link";
import type { CounterpartWithUsage } from "@/server/contexts/report/domain/models/counterpart";
import { Button } from "@/client/components/ui";
import { CounterpartFormDialog } from "./CounterpartFormDialog";
import { DeleteCounterpartButton } from "./DeleteCounterpartButton";

interface CounterpartTableProps {
  counterparts: CounterpartWithUsage[];
  onUpdate: () => void;
}

export function CounterpartTable({ counterparts, onUpdate }: CounterpartTableProps) {
  const [editingCounterpart, setEditingCounterpart] = useState<CounterpartWithUsage | null>(null);

  if (counterparts.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">取引先が登録されていません</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-muted-foreground font-medium">名前</th>
              <th className="text-left py-3 px-4 text-muted-foreground font-medium">住所</th>
              <th className="text-right py-3 px-4 text-muted-foreground font-medium">使用数</th>
              <th className="text-right py-3 px-4 text-muted-foreground font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {counterparts.map((counterpart) => (
              <tr
                key={counterpart.id}
                className="border-b border-border hover:bg-secondary/30 transition-colors"
              >
                <td className="py-3 px-4">
                  <Link
                    href={`/counterparts/${counterpart.id}`}
                    className="text-white hover:text-primary hover:underline transition-colors"
                  >
                    {counterpart.name}
                  </Link>
                </td>
                <td className="py-3 px-4 text-white">{counterpart.address}</td>
                <td className="py-3 px-4 text-white text-right">{counterpart.usageCount}件</td>
                <td className="py-3 px-4 text-right">
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
