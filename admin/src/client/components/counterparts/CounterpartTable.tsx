"use client";
import "client-only";

import { useState } from "react";
import type { CounterpartWithUsage } from "@/server/contexts/report/domain/models/counterpart";
import { EditCounterpartDialog } from "./EditCounterpartDialog";
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
        <p className="text-primary-muted">取引先が登録されていません</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-primary-border">
              <th className="text-left py-3 px-4 text-primary-muted font-medium">名前</th>
              <th className="text-left py-3 px-4 text-primary-muted font-medium">住所</th>
              <th className="text-right py-3 px-4 text-primary-muted font-medium">使用数</th>
              <th className="text-right py-3 px-4 text-primary-muted font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {counterparts.map((counterpart) => (
              <tr
                key={counterpart.id}
                className="border-b border-primary-border hover:bg-primary-hover/30 transition-colors"
              >
                <td className="py-3 px-4 text-white">{counterpart.name}</td>
                <td className="py-3 px-4 text-white">{counterpart.address}</td>
                <td className="py-3 px-4 text-white text-right">{counterpart.usageCount}件</td>
                <td className="py-3 px-4 text-right">
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setEditingCounterpart(counterpart)}
                      className="bg-primary-hover text-white border-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-200 hover:bg-primary-border cursor-pointer"
                    >
                      編集
                    </button>
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
        <EditCounterpartDialog
          counterpart={editingCounterpart}
          onClose={() => setEditingCounterpart(null)}
          onUpdate={() => {
            setEditingCounterpart(null);
            onUpdate();
          }}
        />
      )}
    </>
  );
}
