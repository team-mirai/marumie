import "server-only";
import Image from "next/image";
import Link from "next/link";

interface AnotherPageLinkSectionProps {
  currentSlug: string;
}

export default function AnotherPageLinkSection({ currentSlug }: AnotherPageLinkSectionProps) {
  const getTargetSlug = () => {
    return currentSlug === "digimin" ? "team-mirai" : "digimin";
  };

  const getTargetOrgName = () => {
    return currentSlug === "digimin" ? "政党・チームみらい" : "党首・安野貴博の政治団体";
  };
  return (
    <div className="w-full md:flex md:justify-end">
      <Link
        href={`/o/${getTargetSlug()}`}
        className="bg-white border border-black rounded-2xl md:rounded-3xl px-6 py-6 md:px-12 md:py-9 flex items-center gap-6 md:gap-40 hover:bg-gray-50 transition-colors w-full md:w-auto"
      >
        <div className="text-[17px] md:text-[27px] font-bold text-gray-800 leading-[1.56] tracking-[0.01em] flex-1 md:flex-none">
          {getTargetOrgName()}の
          <br />
          「まる見え政治資金」も公開中
        </div>
        <div className="relative w-[37px] h-[37px]">
          <div className="w-full h-full border border-black rounded-full flex items-center justify-center">
            <Image
              src="/icons/icon-chevron-right-bold.svg"
              alt="詳細を見る"
              width={7}
              height={7}
              className="text-black"
            />
          </div>
        </div>
      </Link>
    </div>
  );
}
