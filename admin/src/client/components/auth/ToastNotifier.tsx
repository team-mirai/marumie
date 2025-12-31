"use client";
import "client-only";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

interface ToastNotifierProps {
  type: "success" | "error";
  message: string;
}

export default function ToastNotifier({ type, message }: ToastNotifierProps) {
  const hasShown = useRef(false);

  useEffect(() => {
    if (message && !hasShown.current) {
      hasShown.current = true;
      if (type === "success") {
        toast.success(message);
      } else {
        toast.error(message);
      }
    }
  }, [type, message]);

  return null;
}
