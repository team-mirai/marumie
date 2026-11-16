interface MainColumnProps {
  children: React.ReactNode;
  className?: string;
  /** セクションの間隔。新デザイン（v8）のページは "compact"（32px） */
  spacing?: "default" | "compact";
  /**
   * 幅。"wide" はトップページ（v9）の幅で、本文の最大幅 1120px・左右の余白は PC 20px／SP 16px
   */
  width?: "default" | "wide";
}

const WIDTH_CLASSES = {
  default: "max-w-[1032px] px-5 min-[641px]:px-0",
  wide: "max-w-[1160px] px-4 min-[641px]:px-5",
} as const;

export default function MainColumn({
  children,
  className = "",
  spacing = "default",
  width = "default",
}: MainColumnProps) {
  const gap = spacing === "compact" ? "space-y-8" : "space-y-12";
  return (
    <main className={`mx-auto ${WIDTH_CLASSES[width]} py-5 min-[641px]:py-6 ${gap} ${className}`}>
      {children}
    </main>
  );
}
