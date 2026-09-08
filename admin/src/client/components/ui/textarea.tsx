import type * as React from "react";

import { cn } from "@/client/lib/index";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-border placeholder:text-disabled-foreground focus-visible:border-ring focus-visible:ring-ring-soft aria-invalid:ring-destructive/40 aria-invalid:border-destructive bg-input flex field-sizing-content min-h-16 w-full rounded-3xl border px-4 py-2 text-base transition-[color,border-color,box-shadow] duration-150 ease-out outline-none focus-visible:ring-[2px] disabled:cursor-not-allowed disabled:border-disabled-border disabled:text-disabled-foreground md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
