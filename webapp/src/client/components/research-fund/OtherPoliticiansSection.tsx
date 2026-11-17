import Link from "next/link";
import PoliticianAvatar from "@/client/components/research-fund/PoliticianAvatar";

interface OtherPolitician {
  slug: string;
  name: string;
  photoUrl: string | null;
  href: string;
}

interface Props {
  politicians: OtherPolitician[];
}

/**
 * ページ下部の「他の議員の調研費を見る」。公開中のほかの議員を 2 列で並べ、押すとその議員のページへ移る。
 * 選挙区は出さず、SP もアイコンの右に名前を並べる。
 */
export default function OtherPoliticiansSection({ politicians }: Props) {
  if (politicians.length === 0) return null;

  return (
    <section
      data-reveal
      aria-labelledby="other-politicians-heading"
      className="rounded-[32px] bg-white px-[18px] py-7 min-[641px]:p-[clamp(28px,4.4vw,64px)]"
    >
      <h2
        id="other-politicians-heading"
        className="m-0 mb-5 text-[clamp(22px,2.4vw,30px)] font-black leading-[1.4] tracking-[0.01em] text-black"
      >
        他の議員の調研費を見る
      </h2>
      <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0 min-[641px]:gap-3">
        {politicians.map((politician) => (
          <li key={politician.slug}>
            <Link
              href={politician.href}
              aria-label={`${politician.name}の調研費を見る`}
              className="group flex h-full items-center gap-2.5 rounded-2xl bg-[#F5F7F6] px-3 py-2.5 text-black no-underline transition-colors hover:bg-[#EAF6F2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#238778] min-[641px]:gap-3.5 min-[641px]:px-4 min-[641px]:py-3.5"
            >
              <PoliticianAvatar
                photoUrl={politician.photoUrl}
                alt={`${politician.name}の写真`}
                className="h-10 w-10 min-[641px]:h-[52px] min-[641px]:w-[52px]"
              />
              <span className="min-w-0 flex-1 truncate text-[14px] font-bold leading-[1.4] min-[641px]:whitespace-normal min-[641px]:text-[16px]">
                {politician.name}
              </span>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="hidden flex-none text-[#238778] transition-transform group-hover:translate-x-[3px] min-[641px]:block"
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
