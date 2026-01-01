import { Subtitle, Title } from "@/client/components/ui/Typography";

interface CardHeaderProps {
  icon: React.ReactNode;
  title: string;
  organizationName?: string;
  updatedAt: string;
  subtitle: string;
}

export default function CardHeader({
  icon,
  title,
  organizationName,
  updatedAt,
  subtitle,
}: CardHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-start md:justify-between w-full gap-2">
      {/* 左側：タイトル・サブタイトル */}
      <div className="flex flex-col gap-2">
        {/* アイコン + タイトル */}
        <div className="flex items-center gap-2">
          {/* アイコン */}
          <div className="w-[30px] h-[30px] flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
          <div className="flex flex-col md:block">
            {organizationName ? (
              <Title className="text-[--color-text-primary]">
                <span className="md:inline block">{organizationName}</span>
                <span className="hidden md:inline mx-1">｜</span>
                <span className="md:inline block">{title}</span>
              </Title>
            ) : (
              <Title className="text-[--color-text-primary]">{title}</Title>
            )}
          </div>
        </div>

        {/* サブタイトル */}
        <Subtitle className="text-[--color-text-secondary]">{subtitle}</Subtitle>
      </div>

      {/* 右側：更新時刻（SPでは非表示） */}
      {updatedAt && (
        <div className="hidden md:flex flex-shrink-0 self-end md:self-start">
          <span className="text-[11px] md:text-[13px] font-bold text-[#9CA3AF] leading-[1.31]">
            {updatedAt}
          </span>
        </div>
      )}
    </div>
  );
}
