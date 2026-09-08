import type * as React from "react";
import { CaretDown } from "@phosphor-icons/react/dist/ssr";

import { cn } from "@/client/lib/index";

/**
 * ネイティブ `<select>` のピル版。
 * Radix Select（`Select` / `SelectTrigger`）を使えない箇所（フォーム送信でそのまま値を扱いたい、
 * E2E が `getByLabel` で直接 select を取りたい等）向けに、ピル形状・黒枠・teal フォーカスリングを揃える。
 * `className` は select 本体に、`wrapperClassName` は外側の相対配置ラッパーに当たる。
 */
function NativeSelect({
  className,
  wrapperClassName,
  ...props
}: React.ComponentProps<"select"> & { wrapperClassName?: string }) {
  return (
    <div data-slot="native-select" className={cn("relative inline-flex w-fit", wrapperClassName)}>
      <select
        className={cn(
          "bg-input border-border text-foreground h-9 w-full min-w-0 appearance-none rounded-full border py-1 pr-10 pl-4 text-sm transition-[color,border-color,box-shadow] duration-150 ease-out outline-none",
          "focus-visible:border-ring focus-visible:ring-ring-soft focus-visible:ring-[2px]",
          "disabled:cursor-not-allowed disabled:border-disabled-border disabled:text-disabled-foreground",
          className,
        )}
        {...props}
      />
      <CaretDown
        aria-hidden
        className="text-muted-foreground pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2"
      />
    </div>
  );
}

export { NativeSelect };
