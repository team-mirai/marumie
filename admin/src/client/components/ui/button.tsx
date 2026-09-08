import type * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/client/lib/index";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-bold transition-colors duration-150 ease-out cursor-pointer disabled:cursor-not-allowed disabled:border-disabled-border disabled:text-disabled-foreground disabled:bg-card [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border-[1.5px] border-primary hover:bg-primary-hover hover:border-primary-hover disabled:border-disabled-border",
        destructive:
          "bg-card text-destructive border-[1.5px] border-destructive hover:bg-destructive-hover focus-visible:ring-destructive/40",
        outline: "bg-card text-foreground border-[1.5px] border-border hover:bg-secondary",
        secondary: "bg-card text-foreground border-[1.5px] border-border hover:bg-secondary",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary-active underline-offset-4 hover:underline hover:text-primary-hover",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 gap-1.5 px-3 has-[>svg]:px-2.5",
        /** テーブル操作列などの小ピル（11px/700、ハンドオフ「4. 取引先マスタ」） */
        xs: "h-7 gap-1 px-3.5 text-[11px] has-[>svg]:px-3",
        lg: "h-10 px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button };
