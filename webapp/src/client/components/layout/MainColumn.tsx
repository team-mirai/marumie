interface MainColumnProps {
  children: React.ReactNode;
  className?: string;
  /**
   * セクションの間隔。新デザイン（v8）のページは "compact"（32px）。
   * "home" はトップページ（v9）の間隔で、縦に並べて間を clamp(40px,5vw,56px) あけ、セクションごとの詰め方は各セクションの margin で決める
   */
  spacing?: "default" | "compact" | "home";
  /**
   * 幅。"wide" はトップページ（v9）の幅で、本文の最大幅 1120px・左右の余白は PC 20px／SP 8px
   * SP の左右の余白は v9（トップ 16px・それ以外 20px）の半分にしてカードを広げている（意図的な逸脱）
   */
  width?: "default" | "wide";
}

const SPACING_CLASSES = {
  default: "space-y-12",
  compact: "space-y-8",
  home: "flex flex-col gap-[clamp(40px,5vw,56px)]",
} as const;

const WIDTH_CLASSES = {
  default: "max-w-[1032px] px-2.5 min-[641px]:px-0",
  wide: "max-w-[1160px] px-2 min-[641px]:px-5",
} as const;

export default function MainColumn({
  children,
  className = "",
  spacing = "default",
  width = "default",
}: MainColumnProps) {
  return (
    <main
      className={`mx-auto ${WIDTH_CLASSES[width]} py-5 min-[641px]:py-6 ${SPACING_CLASSES[spacing]} ${className}`}
    >
      {children}
    </main>
  );
}
