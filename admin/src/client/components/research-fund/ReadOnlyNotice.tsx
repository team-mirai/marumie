import { Eye } from "@phosphor-icons/react/dist/ssr";

/** 担当外の議員室を開いたときに出す「閲覧のみ」の表示（#1773） */
export function ReadOnlyNotice() {
  return (
    <p
      role="status"
      className="mb-4 flex items-center gap-2 rounded-md border border-border bg-secondary px-4 py-3 text-sm text-foreground"
    >
      <Eye aria-hidden className="size-4 shrink-0" />
      <span>
        <span className="font-bold">担当外のため閲覧のみ</span>
        <span className="text-muted-foreground">
          ：この議員室のデータは変更できません。担当の付け替えは管理者に依頼してください。
        </span>
      </span>
    </p>
  );
}
