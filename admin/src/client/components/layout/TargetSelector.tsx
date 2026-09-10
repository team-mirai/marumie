"use client";

import Link from "next/link";
import { useState } from "react";
import { CaretDown, Check, ArrowsLeftRight } from "@phosphor-icons/react/dist/ssr";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/client/components/ui";
import { cn } from "@/client/lib";
import { useAdminTarget } from "@/client/components/layout/AdminTargetProvider";
import { selectAdminTarget } from "@/server/contexts/shared/presentation/actions/select-admin-target";

export function ChangeTargetButton() {
  const { setOpen } = useAdminTarget();
  return (
    <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
      対象を切り替え
    </Button>
  );
}

export function TargetSelector({ collapsed }: { collapsed: boolean }) {
  const { targets, currentTarget, syncKey, open, setOpen } = useAdminTarget();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <Button
        variant="outline"
        aria-label="現在の対象を切り替え"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={cn(
          "mb-5 h-auto w-full rounded-lg border-ring bg-accent p-3 text-left text-accent-foreground",
          collapsed && "px-0",
        )}
      >
        {collapsed ? (
          <ArrowsLeftRight aria-hidden="true" />
        ) : (
          <>
            <span className="min-w-0 flex-1 space-y-1 whitespace-normal">
              <span className="block text-[10px]">現在の対象</span>
              <span className="block text-[10px]">
                {currentTarget?.kind === "research-fund"
                  ? "調査研究費・議員室"
                  : "政治資金・政治団体"}
              </span>
              <span className="block truncate text-xs">
                {currentTarget
                  ? `${currentTarget.name}／${currentTarget.year}年度`
                  : "対象を選択してください"}
              </span>
            </span>
            <CaretDown className="shrink-0" aria-hidden="true" />
          </>
        )}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
      >
        <DialogContent className="max-h-[85vh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>帳簿を切り替え</DialogTitle>
            <DialogDescription>
              切り替えるまで、すべての画面はこの対象に対して操作されます。メニューも対象に合わせて変わります。
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {(["political-organization", "research-fund"] as const).map((kind) => {
            const options = targets.filter((target) => target.kind === kind);
            return (
              <section key={kind} className="space-y-2">
                <h2 className="text-xs font-bold text-muted-foreground">
                  {kind === "research-fund" ? "調査研究費（議員室）" : "政治資金（政治団体）"}
                </h2>
                {options.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    {kind === "research-fund"
                      ? "議員・年度帳簿を作成すると選択できます。"
                      : "政治団体が登録されていません。"}
                  </p>
                )}
                {options.map((target) => (
                  <Button
                    key={target.key}
                    variant="outline"
                    disabled={busy}
                    aria-pressed={target.key === currentTarget?.key}
                    className={cn(
                      "h-auto w-full justify-between rounded-lg py-3 text-left whitespace-normal",
                      target.key === currentTarget?.key &&
                        "border-ring bg-accent text-accent-foreground",
                    )}
                    onClick={async () => {
                      setBusy(true);
                      setError(null);
                      try {
                        const result = await selectAdminTarget(target.key);
                        if (!result.success) {
                          setError(result.error);
                          setBusy(false);
                          return;
                        }
                        try {
                          localStorage.setItem(
                            syncKey,
                            JSON.stringify({ destination: result.destination, nonce: Date.now() }),
                          );
                        } catch {
                          /* cookie による保持は継続する */
                        }
                        window.location.assign(result.destination);
                      } catch {
                        setError("切り替えに失敗しました。もう一度お試しください");
                        setBusy(false);
                      }
                    }}
                  >
                    <span>
                      {target.name}／<span className="font-latin">{target.year}</span>年度
                    </span>
                    {target.key === currentTarget?.key && (
                      <Check className="shrink-0" aria-label="選択中" />
                    )}
                  </Button>
                ))}
              </section>
            );
          })}
          <Button variant="outline" asChild>
            <Link href="/politicians" onClick={() => setOpen(false)}>
              議員一覧・年度帳簿の作成へ
            </Link>
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
