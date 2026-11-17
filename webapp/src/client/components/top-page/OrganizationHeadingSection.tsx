import "server-only";
import ProfileLinks from "@/client/components/common/ProfileLinks";
import YearSegment from "@/client/components/common/YearSegment";
import type { ProfileLink } from "@/client/lib/profile-links";

interface OrganizationHeadingSectionProps {
  /** 団体名（例: 「安野貴博の政治団体」） */
  organizationName: string;
  /** 正式名（例: 「デジタル民主主義を考える会」） */
  formalName: string;
  /** 代表者の顔写真の URL。未登録なら null（人型のアイコンを出す） */
  photoUrl: string | null;
  links: ProfileLink[];
  years: { year: number; href: string }[];
  currentYear: number;
}

interface AvatarProps {
  organizationName: string;
  photoUrl: string | null;
  className: string;
  iconSize: number;
}

/** 代表者の顔写真。未登録なら人型のアイコンにする */
function Avatar({ organizationName, photoUrl, className, iconSize }: AvatarProps) {
  if (photoUrl) {
    return (
      <span
        role="img"
        aria-label={`${organizationName}の代表者の写真`}
        className={`flex-shrink-0 rounded-full bg-[#5FD3C2] bg-cover bg-center bg-no-repeat ${className}`}
        style={{ backgroundImage: `url("${photoUrl}")` }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`flex flex-shrink-0 items-center justify-center rounded-full bg-[#5FD3C2] text-white ${className}`}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <circle cx="12" cy="8.5" r="4" />
        <path d="M4 20.5c0-4.1 3.6-6.5 8-6.5s8 2.4 8 6.5z" />
      </svg>
    </span>
  );
}

/**
 * 政治団体ページ冒頭の見出しカード。
 * PC は白いカードに代表者の写真・団体名・正式名と年・公式サイトと SNS・年の切り替えを並べる。
 * SP は一番上のプロフィールカードとして、トップの「議員の政治団体」カードと同じミストグラデーションの面
 * （写真・団体名・正式名と年・左下に年の切り替え）を出す。
 */
export default function OrganizationHeadingSection({
  organizationName,
  formalName,
  photoUrl,
  links,
  years,
  currentYear,
}: OrganizationHeadingSectionProps) {
  const yearLabel = `${currentYear}年`;

  return (
    <>
      <section aria-label="政治団体情報" data-reveal className="hidden min-[641px]:block">
        <div className="flex items-center gap-5 rounded-[32px] bg-white px-8 py-7 shadow-[inset_0_0_0_1px_#DCE4E1]">
          <Avatar
            organizationName={organizationName}
            photoUrl={photoUrl}
            className="h-[88px] w-[88px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]"
            iconSize={44}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <b className="break-keep text-[30px] font-black leading-[1.25] tracking-[0.01em] [overflow-wrap:anywhere]">
              {organizationName}
            </b>
            <span className="text-[14px] font-bold tracking-[0.02em] text-[#238778]">
              {formalName}・{yearLabel}
            </span>
            <ProfileLinks ownerName={organizationName} links={links} />
          </div>
          <div className="flex-shrink-0">
            <YearSegment years={years} currentYear={currentYear} tone="plain" />
          </div>
        </div>
      </section>

      {/* SP：トップの「議員の政治団体」カードと同じ面。更新日は面に出さず、各カードの右下に出す */}
      <section aria-label="政治団体情報" data-reveal className="min-[641px]:hidden">
        <div className="mist-surface mist-surface-group mx-auto grid aspect-[1.9825] w-[calc((100%-40px)*1.071*1.04)] grid-cols-[auto_minmax(0,1fr)] grid-rows-[auto_1fr_auto] items-center gap-x-[11px] rounded-[20px] pb-[14px] pl-4 pr-[14px] pt-4">
          <Avatar
            organizationName={organizationName}
            photoUrl={photoUrl}
            className="col-start-1 row-start-1 h-[46px] w-[46px] shadow-[0_0_0_2px_rgba(255,255,255,0.95),0_4px_10px_-4px_rgba(10,60,52,0.35)]"
            iconSize={24}
          />
          <span className="col-start-2 row-start-1 flex min-w-0 flex-col gap-1">
            <b className="break-keep text-[18px] font-black leading-[1.3] tracking-[0.01em] [overflow-wrap:anywhere]">
              {organizationName}
            </b>
            <span className="text-[14px] font-bold text-[#238778]">
              {formalName}・<span className="whitespace-nowrap">{yearLabel}</span>
            </span>
          </span>
          <div className="col-span-full row-start-3 self-end justify-self-start">
            <YearSegment years={years} currentYear={currentYear} />
          </div>
        </div>
      </section>
    </>
  );
}
