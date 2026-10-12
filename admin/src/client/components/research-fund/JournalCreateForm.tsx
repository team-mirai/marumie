"use client";
import { useEffect, useId, useState } from "react";
import { Button, Label, Textarea } from "@/client/components/ui";
import {
  detailLabelClassName,
  detailRowClassName,
  JournalPublicFields,
} from "@/client/components/research-fund/JournalPublicFields";
import { cn } from "@/client/lib";
import type {
  JournalEdit,
  ReviewAccount,
} from "@/server/contexts/research-fund/domain/models/journal-review";

/** 領収書なしの支出を下書きとして手動で作るフォーム（「手動で仕訳を作成」のダイアログ） */
export function JournalCreateForm({
  accounts,
  year,
  pending,
  onCreate,
}: {
  accounts: ReviewAccount[];
  year: number;
  pending: boolean;
  onCreate: (input: JournalEdit) => void;
}) {
  const fieldId = useId();
  const [input, setInput] = useState<JournalEdit>({
    entryDate: `${year}-01-01`,
    amount: 1,
    description: "",
    accountKey: "",
    note: "",
    memo: "",
  });
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);
  function change<K extends keyof JournalEdit>(key: K, value: JournalEdit[K]) {
    setDirty(true);
    setInput((old) => ({ ...old, [key]: value }));
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onCreate(input);
      }}
      className="space-y-4"
      data-journal-dirty={dirty}
    >
      <fieldset disabled={pending} className="min-w-0 space-y-3">
        <JournalPublicFields
          fieldId={fieldId}
          entry={null}
          input={input}
          accounts={accounts}
          year={year}
          readOnly={false}
          onChange={change}
        />
        <div className={cn(detailRowClassName, "items-start")}>
          <Label htmlFor={`${fieldId}-memo`} className={cn(detailLabelClassName, "pt-2")}>
            備考
          </Label>
          <Textarea
            id={`${fieldId}-memo`}
            value={input.memo}
            placeholder="事務所内のメモ（公開されない）"
            className="min-h-12 text-[12.5px] md:text-[12.5px]"
            onChange={(e) => change("memo", e.target.value)}
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit">下書きを作成</Button>
        </div>
      </fieldset>
    </form>
  );
}
