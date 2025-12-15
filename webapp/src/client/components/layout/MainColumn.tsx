interface MainColumnProps {
  children: React.ReactNode;
  className?: string;
}

export default function MainColumn({ children, className = "" }: MainColumnProps) {
  return (
    <main className={`mx-auto max-w-[1032px] px-5 sm:px-0 py-5 sm:py-6 space-y-12 ${className}`}>
      {children}
    </main>
  );
}
