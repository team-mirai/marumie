import Link from "next/link";
import PoliticianAvatar from "@/client/components/research-fund/PoliticianAvatar";

interface OtherPolitician {
  slug: string;
  name: string;
  /** 「衆議院議員・比例東京（東京7区）」。未登録なら null */
  title: string | null;
  photoUrl: string | null;
  href: string;
}

interface Props {
  politicians: OtherPolitician[];
}

/** ページ下部の「ほかの議員の調研費」。公開中のほかの議員を 2 列で並べ、押すとその議員のページへ移る。 */
export default function OtherPoliticiansSection({ politicians }: Props) {
  if (politicians.length === 0) return null;

  return (
    <section
      aria-labelledby="other-politicians-heading"
      className="rounded-[32px] bg-white px-[18px] py-7 md:p-[clamp(28px,4.4vw,64px)]"
    >
      <h2
        id="other-politicians-heading"
        className="m-0 mb-5 text-[clamp(22px,2.4vw,30px)] font-black leading-[1.4] tracking-[0.01em] text-black"
      >
        ほかの議員の調研費
      </h2>
      <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0 md:gap-3">
        {politicians.map((politician) => (
          <li key={politician.slug}>
            <Link
              href={politician.href}
              aria-label={`${politician.name}の調研費を見る`}
              className="group flex h-full flex-col items-center gap-2 rounded-2xl bg-[#F5F7F6] px-2 py-3.5 text-center text-black no-underline transition-colors hover:bg-[#EAF6F2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#238778] md:flex-row md:gap-3.5 md:px-4 md:text-left"
            >
              <PoliticianAvatar
                photoUrl={politician.photoUrl}
                alt={`${politician.name}の写真`}
                className="h-14 w-14 md:h-[52px] md:w-[52px]"
              />
              <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <span className="text-[14px] font-bold leading-[1.4] md:text-[16px]">
                  {politician.name}
                </span>
                {politician.title && (
                  <span className="line-clamp-2 text-[11px] leading-[1.5] text-[#4B5563] md:line-clamp-1 md:text-[12px]">
                    {politician.title}
                  </span>
                )}
              </span>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="hidden flex-none text-[#238778] transition-transform group-hover:translate-x-[3px] md:block"
              >
                <path
                  d="M9 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
