import MainColumn from "@/client/components/layout/MainColumn";
import MainColumnCard from "@/client/components/layout/MainColumnCard";

interface SectionTitleProps {
  children: React.ReactNode;
}

function SectionTitle({ children }: SectionTitleProps) {
  return (
    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6 font-japanese">{children}</h2>
  );
}

interface SubSectionTitleProps {
  children: React.ReactNode;
}

export function SubSectionTitle({ children }: SubSectionTitleProps) {
  return (
    <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 font-japanese">{children}</h3>
  );
}

interface ParagraphProps {
  children: React.ReactNode;
  className?: string;
}

export function Paragraph({ children, className = "" }: ParagraphProps) {
  return (
    <p
      className={`text-[11px] sm:text-[15px] leading-[1.82] sm:leading-[1.87] tracking-[0.01em] text-gray-500 sm:text-gray-800 font-medium sm:font-normal font-japanese ${className}`}
    >
      {children}
    </p>
  );
}

interface ListProps {
  items: string[];
}

export function List({ items }: ListProps) {
  return (
    <ul className="list-disc list-inside text-[11px] sm:text-[15px] leading-[1.82] sm:leading-[1.87] tracking-[0.01em] text-gray-500 sm:text-gray-800 font-medium sm:font-normal font-japanese space-y-1">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

interface LegalPageLayoutProps {
  title: string;
  children: React.ReactNode;
}

export default function LegalPageLayout({ title, children }: LegalPageLayoutProps) {
  return (
    <MainColumn>
      <MainColumnCard>
        <div className="space-y-9">
          <div>
            <SectionTitle>{title}</SectionTitle>
            {children}
          </div>
        </div>
      </MainColumnCard>
    </MainColumn>
  );
}
