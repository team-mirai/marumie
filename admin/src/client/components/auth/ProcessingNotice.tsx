import { CircleNotch } from "@phosphor-icons/react/dist/ssr";

interface ProcessingNoticeProps {
  title: string;
  description: string;
}

/**
 * ログイン画面で招待・パスワード再設定トークンを処理中に、カードの下に出す通知。
 * 白カード（黒1px枠・角丸8px）+ teal スピナー。
 */
export function ProcessingNotice({ title, description }: ProcessingNoticeProps) {
  return (
    <div
      role="status"
      className="flex w-full max-w-md items-center gap-3 rounded-lg border border-border bg-card px-6 py-4"
    >
      <CircleNotch size={20} className="shrink-0 animate-spin text-primary" aria-hidden="true" />
      <div>
        <p className="text-[13px] font-bold text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
