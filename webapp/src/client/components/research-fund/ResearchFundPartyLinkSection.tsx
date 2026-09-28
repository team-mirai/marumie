import "server-only";
import Image from "next/image";
import Link from "next/link";

/** B-7 政党ページへの導線。カード全体がリンクで、政党・チームみらいのページへ遷移する。 */
export default function ResearchFundPartyLinkSection() {
  return (
    <Link
      href="/o/team-mirai"
      className="bg-white rounded-3xl px-6 py-6 md:px-12 md:py-8 flex items-center justify-between gap-4 hover:opacity-90 transition-opacity"
    >
      <span className="text-[17px] md:text-2xl font-bold text-gray-800 leading-[1.56] tracking-[0.01em] font-japanese">
        政党・チームみらいの「まる見え政治資金」も公開中
      </span>
      <span className="inline-flex items-center justify-center w-12 h-12 shrink-0 border border-gray-800 rounded-full bg-white">
        <Image src="/icons/icon-chevron-right-bold.svg" alt="" width={8} height={8} />
      </span>
    </Link>
  );
}
