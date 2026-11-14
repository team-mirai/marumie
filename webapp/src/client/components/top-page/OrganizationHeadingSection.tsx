import "server-only";
import ProfileLinks from "@/client/components/common/ProfileLinks";
import YearSegment from "@/client/components/common/YearSegment";
import type { ProfileLink } from "@/client/lib/profile-links";

interface OrganizationHeadingSectionProps {
  /** 団体名（例: 「安野貴博の政治団体」） */
  organizationName: string;
  /** 正式名と年（例: 「デジタル民主主義を考える会・2026年」） */
  subtitle: string;
  /** 代表者の顔写真の URL。未登録なら null（人型のアイコンを出す） */
  photoUrl: string | null;
  links: ProfileLink[];
  years: { year: number; href: string }[];
  currentYear: number;
}

/**
 * 政治団体ページ冒頭の見出しカード（PC のみ）。代表者の写真・団体名・正式名と年・公式サイトと SNS・年の切り替えを並べる。
 * SP では出さない（団体名はパンくずと各カードの小見出しで分かる）。
 */
export default function OrganizationHeadingSection({
  organizationName,
  subtitle,
  photoUrl,
  links,
  years,
  currentYear,
}: OrganizationHeadingSectionProps) {
  return (
    <section aria-label="政治団体情報" className="hidden md:block">
      <div className="flex items-center gap-5 rounded-[32px] bg-white px-8 py-7 shadow-[inset_0_0_0_1px_#DCE4E1]">
        {photoUrl ? (
          <span
            role="img"
            aria-label={`${organizationName}の代表者の写真`}
            className="h-[88px] w-[88px] flex-shrink-0 rounded-full bg-[#5FD3C2] bg-cover bg-center bg-no-repeat shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]"
            style={{ backgroundImage: `url("${photoUrl}")` }}
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-[88px] w-[88px] flex-shrink-0 items-center justify-center rounded-full bg-[#5FD3C2] text-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]"
          >
            <svg width="44" height="44" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="12" cy="8.5" r="4" />
              <path d="M4 20.5c0-4.1 3.6-6.5 8-6.5s8 2.4 8 6.5z" />
            </svg>
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <b className="break-keep text-[30px] font-black leading-[1.25] tracking-[0.01em] [overflow-wrap:anywhere]">
            {organizationName}
          </b>
          <span className="text-[14px] font-bold tracking-[0.02em] text-[#238778]">{subtitle}</span>
          <ProfileLinks ownerName={organizationName} links={links} />
        </div>
        <div className="flex-shrink-0">
          <YearSegment years={years} currentYear={currentYear} variant="outline" />
        </div>
      </div>
    </section>
  );
}
