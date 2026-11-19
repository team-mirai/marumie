"use client";
import { Check, MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { PayeeForm } from "@/client/components/research-fund/PayeeForm";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@/client/components/ui";
import { cn } from "@/client/lib";
import { filterPayees } from "@/client/lib/research-fund-payee-search";
import type { Payee, PayeeFormInput } from "@/server/contexts/research-fund/domain/models/payee";
import type { AdminTarget } from "@/server/contexts/shared/domain/models/admin-target";

/**
 * 仕訳に支払先を紐づけるダイアログ。既存の支払先を検索して選ぶか、その場で支払先を作成して紐づける。
 * 選べる支払先は帳簿の議員の支払先だけ（サーバーが渡したもの）。紐づけは「手動」として記録される。
 *
 * 候補をクリックしても選ぶだけで、紐づけは「紐づける」を押したときだけ行う。
 * 紐づけを外す操作は候補に混ぜず、今の支払先があるときだけ別の操作として出す。
 */
export function PayeeLinkDialog({
  open,
  onOpenChange,
  description,
  payees,
  currentPayeeId,
  target,
  defaultSearchQuery,
  pending,
  onLink,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  description: string;
  payees: readonly Payee[];
  /** 対象の仕訳に今紐づいている支払先（まちまちなら null） */
  currentPayeeId: string | null;
  /** 支払先を新規作成するときの住所検索に使う帳簿の議員 */
  target: Pick<Extract<AdminTarget, { kind: "research-fund" }>, "politicianId" | "bookId">;
  /** 支払先を新規作成するときの AI 検索の初期値（書類から読み取った発行元の名前。無ければ空） */
  defaultSearchQuery: string;
  pending: boolean;
  onLink: (payeeId: string | null) => void;
  onCreate: (input: PayeeFormInput) => void;
}) {
  const fieldId = useId();
  const listboxId = `${fieldId}-listbox`;
  const optionId = (payeeId: string) => `${fieldId}-option-${payeeId}`;
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const listboxRef = useRef<HTMLDivElement>(null);

  const currentPayee = payees.find((payee) => payee.id === currentPayeeId) ?? null;
  const candidates = filterPayees(payees, query);
  const selected = payees.find((payee) => payee.id === selectedId) ?? null;
  const canLink = !pending && selected !== null && selected.id !== currentPayeeId;

  // キーボードで選んだ候補が、スクロールするリストの外に隠れないようにする
  useEffect(() => {
    if (!selectedId) return;
    const option = Array.from(listboxRef.current?.children ?? []).find(
      (el) => el instanceof HTMLElement && el.dataset.payeeId === selectedId,
    );
    option?.scrollIntoView?.({ block: "nearest" });
  }, [selectedId]);

  const startCreating = () => setCreating(true);

  const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      // Enter で紐づけたりダイアログを閉じたりしない（確定は「紐づける」ボタンだけ）
      e.preventDefault();
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Home" && e.key !== "End") {
      return;
    }
    if (candidates.length === 0) return;
    e.preventDefault();
    const index = candidates.findIndex((payee) => payee.id === selectedId);
    const last = candidates.length - 1;
    const next =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? last
          : e.key === "ArrowDown"
            ? index === -1
              ? 0
              : Math.min(index + 1, last)
            : index === -1
              ? last
              : Math.max(index - 1, 0);
    setSelectedId(candidates[next].id);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next);
      }}
    >
      <DialogContent
        className={creating ? "max-h-[90vh] overflow-y-auto" : "flex max-h-[90vh] flex-col"}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>{creating ? "支払先を作成して紐づける" : "支払先を紐づける"}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
          {!creating && (
            <p className="text-muted-foreground text-sm">
              既存の支払先から選んで「紐づける」を押してください。見つからなければ新しく作成できます。
            </p>
          )}
        </DialogHeader>
        {creating ? (
          <PayeeForm
            initial={null}
            target={target}
            defaultSearchQuery={query.trim() || defaultSearchQuery}
            pending={pending}
            submitLabel="作成して紐づける"
            onSubmit={onCreate}
            onCancel={() => setCreating(false)}
          />
        ) : (
          <>
            {currentPayee && (
              <section
                aria-label="現在の支払先"
                className="flex shrink-0 flex-wrap items-start justify-between gap-3 rounded-md border border-border-soft p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-muted-foreground text-xs font-bold">現在の支払先</p>
                  <PayeeSummaryLines payee={currentPayee} />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={pending}
                    onClick={() => onLink(null)}
                  >
                    紐づけを外す
                  </Button>
                  <p className="text-muted-foreground text-[11px]">
                    支払先は未設定に戻ります（支払先そのものは削除されません）
                  </p>
                </div>
              </section>
            )}
            <div className="flex shrink-0 flex-col gap-2">
              <Label htmlFor={`${fieldId}-search`}>支払先を検索</Label>
              <div className="relative">
                <MagnifyingGlass
                  aria-hidden
                  className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                />
                <Input
                  id={`${fieldId}-search`}
                  role="combobox"
                  aria-expanded
                  aria-controls={listboxId}
                  aria-autocomplete="list"
                  aria-activedescendant={
                    selected && candidates.includes(selected) ? optionId(selected.id) : undefined
                  }
                  className="pl-9"
                  placeholder="名前・住所・登録番号で検索"
                  autoComplete="off"
                  value={query}
                  disabled={pending}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                />
              </div>
            </div>
            {candidates.length > 0 ? (
              <div
                ref={listboxRef}
                id={listboxId}
                role="listbox"
                aria-label="支払先の候補"
                className="min-h-0 overflow-y-auto rounded-md border border-border"
              >
                {candidates.map((payee) => {
                  const isSelected = payee.id === selectedId;
                  const isCurrent = payee.id === currentPayeeId;
                  return (
                    // キーボード操作は検索窓（combobox）が受け持ち、候補には aria-activedescendant でフォーカスを示す
                    // biome-ignore lint/a11y/useKeyWithClickEvents: 上記のとおり検索窓で矢印キーを受ける
                    <div
                      key={payee.id}
                      id={optionId(payee.id)}
                      data-payee-id={payee.id}
                      role="option"
                      tabIndex={-1}
                      aria-selected={isSelected}
                      aria-disabled={pending || undefined}
                      className={cn(
                        "flex cursor-pointer items-start gap-2 border-b border-border-soft px-3 py-2 transition-colors duration-150 ease-out last:border-b-0",
                        isSelected ? "bg-accent text-accent-foreground" : "hover:bg-background",
                      )}
                      onClick={() => {
                        if (!pending) setSelectedId(payee.id);
                      }}
                    >
                      <Check
                        aria-hidden
                        weight="bold"
                        className={cn("mt-0.5 size-4 shrink-0", !isSelected && "invisible")}
                      />
                      <div className="min-w-0 flex-1">
                        <PayeeSummaryLines payee={payee} />
                      </div>
                      {isCurrent && (
                        <span className="shrink-0 rounded-full border border-border-soft bg-card px-2 py-0.5 text-[11px] text-muted-foreground">
                          現在の支払先
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                id={listboxId}
                role="status"
                className="flex shrink-0 flex-col items-start gap-2 rounded-md border border-border p-3 text-sm"
              >
                <p>
                  {query.trim()
                    ? `「${query.trim()}」に一致する支払先は見つかりませんでした。`
                    : "まだ支払先が登録されていません。"}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={startCreating}
                >
                  新しい支払先を作成して紐づける
                </Button>
              </div>
            )}
            {candidates.length > 0 && (
              <p className="text-muted-foreground shrink-0 text-xs">
                一覧に無いときは{" "}
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  disabled={pending}
                  onClick={startCreating}
                >
                  新しい支払先を作成して紐づける
                </Button>
              </p>
            )}
            <DialogFooter className="shrink-0 items-center sm:justify-between">
              <p className="text-sm break-words" aria-live="polite">
                {selected ? (
                  selected.id === currentPayeeId ? (
                    "選んだ支払先は今の支払先と同じです"
                  ) : (
                    <>
                      紐づけ先：<span className="font-bold">{selected.name}</span>
                    </>
                  )
                ) : (
                  <span className="text-muted-foreground">支払先を選んでください</span>
                )}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => onOpenChange(false)}
                >
                  キャンセル
                </Button>
                <Button
                  type="button"
                  disabled={!canLink}
                  onClick={() => {
                    if (selected) onLink(selected.id);
                  }}
                >
                  紐づける
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** 支払先の名前・住所・登録番号を別の行に、省略せず折り返して出す（同名の支払先を住所で見分けられるように） */
function PayeeSummaryLines({ payee }: { payee: Payee }) {
  return (
    <>
      <p className="text-sm font-bold break-words">{payee.name}</p>
      <p className="text-xs break-words">
        {payee.address || <span className="text-muted-foreground">住所未入力</span>}
      </p>
      {payee.invoiceRegistrationNumber && (
        <p className="font-latin text-[11px] text-muted-foreground">
          {payee.invoiceRegistrationNumber}
        </p>
      )}
    </>
  );
}
