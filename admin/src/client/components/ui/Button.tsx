"use client";
import "client-only";

import { type ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className = "", variant = "primary", size = "md", fullWidth = false, children, ...props },
    ref,
  ) => {
    const baseClasses =
      "font-medium rounded-lg border-0 cursor-pointer transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-accent";

    const variantClasses = {
      primary: "bg-primary-accent text-white hover:bg-blue-600 focus:ring-primary-accent",
      secondary:
        "bg-primary-panel text-white border border-primary-border hover:bg-primary-hover focus:ring-primary-muted",
      danger: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-400",
    };

    const sizeClasses = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2.5 text-sm",
      lg: "px-6 py-3 text-base",
    };

    const widthClass = fullWidth ? "w-full" : "";

    const classes =
      `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`.trim();

    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";

export default Button;
