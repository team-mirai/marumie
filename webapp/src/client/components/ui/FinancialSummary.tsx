interface FinancialSummaryProps {
  children: React.ReactNode;
  className?: string;
}

export default function FinancialSummary({ children, className = "" }: FinancialSummaryProps) {
  return <div className={`flex items-center gap-6 ${className}`}>{children}</div>;
}
