import { cn } from "@/client/lib";

interface FormErrorAlertProps {
  message: string;
  className?: string;
}

/** 紐付けダイアログ内のエラー表示（赤枠・淡い赤背景・赤文字）。 */
export function FormErrorAlert({ message, className }: FormErrorAlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg border border-destructive bg-destructive-hover p-3 text-sm text-destructive",
        className,
      )}
    >
      {message}
    </div>
  );
}
