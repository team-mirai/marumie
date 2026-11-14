interface MainColumnProps {
  children: React.ReactNode;
  className?: string;
  /** セクションの間隔。新デザイン（v8）のページは "compact"（32px） */
  spacing?: "default" | "compact";
}

export default function MainColumn({
  children,
  className = "",
  spacing = "default",
}: MainColumnProps) {
  const gap = spacing === "compact" ? "space-y-8" : "space-y-12";
  return (
    <main className={`mx-auto max-w-[1032px] px-5 sm:px-0 py-5 sm:py-6 ${gap} ${className}`}>
      {children}
    </main>
  );
}
