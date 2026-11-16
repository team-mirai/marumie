/** 外部リンクの末尾に付ける、別タブで開くことの印（読み上げ用の「（別タブで開きます）」と ↗ のアイコン）。 */
export default function NewTabMark() {
  return (
    <>
      <span className="sr-only">（別タブで開きます）</span>
      <NewTabIcon />
    </>
  );
}

/** 別タブで開くリンクの矢印（↗）。aria-label で「（別タブで開きます）」を読ませるリンクでは、こちらだけを付ける。 */
export function NewTabIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="ml-0.5 inline-block h-[0.85em] w-[0.85em] align-[-0.05em]"
    >
      <path d="M7 17L17 7M9 7h8v8" />
    </svg>
  );
}
