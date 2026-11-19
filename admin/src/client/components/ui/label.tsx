"use client";

import type * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

import { cn } from "@/client/lib/index";

/**
 * フォームラベル。ハンドオフ既定は 12px/700（text-xs font-bold）。
 * 無効表現は opacity ではなく text-disabled-foreground で行う（admin-ui-guidelines 参照）。
 */
function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-xs leading-none font-bold select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:text-disabled-foreground peer-disabled:cursor-not-allowed peer-disabled:text-disabled-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
