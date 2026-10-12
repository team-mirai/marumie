"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { DotsThree } from "@phosphor-icons/react/dist/ssr";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/client/components/ui";

export interface BulkAction {
  label: string;
  /** default（primary）は幅が足りなくてもバーに残す。それ以外は「…」メニューに入る */
  variant: "default" | "outline" | "destructive";
  onSelect: () => void;
}

const buttonClass = "h-[30px] px-3 text-xs";

/**
 * 一覧カードの下部に重ねる、まとめて操作バー。
 * 全部のボタンが 1 行に収まらないときは、primary 以外を「…」メニューに入れる。
 */
export function JournalBulkActionBar({
  count,
  mixed,
  pending,
  actions,
}: {
  count: number;
  /** 状態が混ざった選択か（見出しと補足を変える） */
  mixed: boolean;
  pending: boolean;
  actions: readonly BulkAction[];
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const labels = actions.map((a) => a.label).join("\n");
  useLayoutEffect(() => {
    const bar = barRef.current;
    const heading = headingRef.current;
    const measure = measureRef.current;
    if (!bar || !heading || !measure) return;
    // 見出しと、全部のボタンを 1 行に並べた幅（測定用の不可視の複製）がバーの内側に収まるかで決める
    const update = () => {
      const style = getComputedStyle(bar);
      const inner =
        bar.clientWidth -
        Number.parseFloat(style.paddingLeft) -
        Number.parseFloat(style.paddingRight);
      const gap = Number.parseFloat(style.columnGap) || 0;
      setCollapsed(heading.offsetWidth + gap + measure.offsetWidth > inner);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(bar);
    observer.observe(heading);
    observer.observe(measure);
    return () => observer.disconnect();
  }, [labels]);
  const heading = (
    <span
      ref={headingRef}
      className="mr-auto shrink-0 text-xs font-bold"
      title={
        mixed ? "状態が混ざっているため、選んだ全件に使える操作だけを表示しています" : undefined
      }
    >
      <span className="font-latin">{count}</span>
      {mixed ? "件の仕訳を選択中" : "件選択"}
    </span>
  );
  const inline = collapsed ? actions.filter((a) => a.variant === "default") : actions;
  const folded = collapsed ? actions.filter((a) => a.variant !== "default") : [];
  return (
    <div
      ref={barRef}
      className="absolute right-2.5 bottom-3 left-2.5 flex flex-wrap items-center gap-1.5 rounded-[24px] border border-border bg-card py-1.5 pr-1.5 pl-4 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
    >
      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none invisible absolute top-0 left-0 flex w-max items-center gap-1.5"
      >
        {actions.map((action) => (
          <Button
            key={action.label}
            variant={action.variant}
            size="sm"
            className={buttonClass}
            tabIndex={-1}
          >
            {action.label}
          </Button>
        ))}
      </div>
      {heading}
      {folded.length > 0 && (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="size-[30px]"
              aria-label="ほかの操作"
              disabled={pending}
            >
              <DotsThree weight="bold" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top">
            {folded.map((action) => (
              <DropdownMenuItem
                key={action.label}
                variant={action.variant === "destructive" ? "destructive" : "default"}
                disabled={pending}
                onSelect={action.onSelect}
              >
                {action.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {inline.map((action) => (
        <Button
          key={action.label}
          variant={action.variant}
          size="sm"
          className={buttonClass}
          disabled={pending}
          onClick={action.onSelect}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}
