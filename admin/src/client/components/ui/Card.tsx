"use client";
import "client-only";

import type { HTMLAttributes } from "react";
import { forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "outlined";
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = "", variant = "default", children, ...props }, ref) => {
    const baseClasses = "rounded-xl p-4";

    const variantClasses = {
      default: "bg-primary-panel",
      outlined: "bg-transparent border border-primary-border",
    };

    const classes = `${baseClasses} ${variantClasses[variant]} ${className}`.trim();

    return (
      <div ref={ref} className={classes} {...props}>
        {children}
      </div>
    );
  },
);

Card.displayName = "Card";

export default Card;
