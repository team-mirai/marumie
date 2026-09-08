import type * as React from "react";

import { cn } from "@/client/lib/index";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-disabled-foreground selection:bg-primary selection:text-primary-foreground bg-input border-border h-9 w-full min-w-0 rounded-full border px-4 py-1 text-base transition-[color,border-color,box-shadow] duration-150 ease-out outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:cursor-not-allowed disabled:border-disabled-border disabled:text-disabled-foreground md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring-soft focus-visible:ring-[2px]",
        "aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
