import { SignOut } from "@phosphor-icons/react/dist/ssr";
import { BrandWordmark } from "@/client/components/layout/BrandWordmark";
import { Button } from "@/client/components/ui";

interface NoRoleNoticeProps {
  userEmail: string;
  logoutAction: (formData: FormData) => Promise<void>;
}

/**
 * ロールを 1 つも持たないユーザーに出す案内。
 * 使える機能が無いのでサイドバーも出さず、管理者への連絡とログアウトだけを促す。
 */
export function NoRoleNotice({ userEmail, logoutAction }: NoRoleNoticeProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-5 rounded-lg border border-border bg-card p-8">
        <BrandWordmark />
        <div className="space-y-2">
          <h1 className="text-lg font-bold text-foreground">利用できる機能がありません</h1>
          <p className="text-sm text-muted-foreground">
            このアカウントにはまだ機能が割り当てられていません。管理者に連絡してください。
          </p>
          <p className="font-latin text-xs text-muted-foreground">{userEmail}</p>
        </div>
        <form action={logoutAction}>
          <Button type="submit" variant="secondary" className="w-full">
            <SignOut size={16} aria-hidden="true" />
            ログアウト
          </Button>
        </form>
      </div>
    </main>
  );
}
