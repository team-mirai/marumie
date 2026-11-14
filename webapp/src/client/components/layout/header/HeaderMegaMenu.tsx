import Link from "next/link";
import HeaderYearSegment from "@/client/components/layout/header/HeaderYearSegment";
import PoliticianInitialAvatar from "@/client/components/layout/header/PoliticianInitialAvatar";
import type {
  HeaderOrganizationMenuItem,
  HeaderPoliticianMenuItem,
} from "@/client/lib/header-navigation";

interface HeaderMegaMenuProps {
  id: string;
  menu: "pf" | "rf";
  organizations: HeaderOrganizationMenuItem[];
  politicians: HeaderPoliticianMenuItem[];
  onNavigate: () => void;
}

/** PC のナビの「政党・政治団体▼」「調研費▼」で開くメニュー（デザイン v8 のメガメニュー）。 */
export default function HeaderMegaMenu({
  id,
  menu,
  organizations,
  politicians,
  onNavigate,
}: HeaderMegaMenuProps) {
  return (
    <div
      id={id}
      className="mt-3 max-h-[calc(100vh-140px)] overflow-y-auto border-t border-[#EEF0EF] px-4 pt-7 pb-5"
    >
      {menu === "pf" ? (
        <section aria-label="政党・政治団体" className="flex flex-col gap-1">
          <p className="mb-1.5 text-[11px] font-bold tracking-[0.06em] text-[#6B7280]">
            政治資金｜政党・政治団体が集めて使うお金
          </p>
          <ul>
            {organizations.map((organization) => (
              <li
                key={organization.slug}
                className="flex items-center gap-5 border-b border-[#F3F4F6] py-3"
              >
                <Link
                  href={organization.href}
                  onClick={onNavigate}
                  className="flex min-w-0 flex-col gap-0.5 text-[#111827] hover:text-[#238778]"
                >
                  <span className="flex items-center gap-2.5 whitespace-nowrap text-[22px] font-bold leading-[1.3]">
                    {organization.name}
                    {organization.isCurrent && (
                      <span className="rounded-full bg-black px-2 py-0.5 text-[11px] font-bold leading-normal text-white">
                        表示中
                      </span>
                    )}
                  </span>
                  {organization.officialName && (
                    <span className="whitespace-nowrap text-xs text-[#6B7280]">
                      {organization.officialName}
                    </span>
                  )}
                </Link>
                <HeaderYearSegment
                  name={organization.name}
                  years={organization.years}
                  onNavigate={onNavigate}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section aria-label="調研費" className="flex flex-col gap-3.5">
          <p className="text-[13px] font-bold tracking-[0.04em] text-[#374151]">
            所属議員の調研費｜毎月支給される公費を何に使ったか
          </p>
          <ul className="grid grid-cols-3 gap-x-6 gap-y-2">
            {politicians.map((politician) => (
              <li key={politician.slug} className="flex min-w-0 items-center gap-3">
                <Link
                  href={politician.href}
                  onClick={onNavigate}
                  aria-current={politician.isCurrent ? "page" : undefined}
                  className="flex min-h-14 items-center gap-3.5 whitespace-nowrap text-[17px] font-bold text-[#111827] hover:text-[#238778]"
                >
                  <PoliticianInitialAvatar name={politician.name} size="lg" />
                  {politician.name}
                </Link>
                <HeaderYearSegment
                  name={`${politician.name}の調研費`}
                  years={politician.years}
                  onNavigate={onNavigate}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
