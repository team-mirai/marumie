"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--color-card)",
          "--normal-text": "var(--color-card-foreground)",
          "--normal-border": "var(--color-border)",
          "--success-bg": "var(--color-card)",
          "--success-text": "var(--color-card-foreground)",
          "--success-border": "var(--color-border)",
          "--error-bg": "var(--color-destructive)",
          "--error-text": "var(--color-destructive-foreground)",
          "--error-border": "var(--color-destructive)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
