interface CardSummaryProps {
  children: React.ReactNode;
  className?: string;
}

export default function CardSummary({ children, className = "" }: CardSummaryProps) {
  return (
    <div
      className={`
        border border-[#E5E7EB]
        rounded-2xl
        p-6
        ${className}
      `}
    >
      {children}
    </div>
  );
}
