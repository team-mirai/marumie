import "server-only";
import type { ReactNode } from "react";

interface TransparencySectionProps {
  title: string;
  /** 「その理由はこちらのnoteをお読みください。」の前に置く本文。省略すると政治団体ページの文言になる。 */
  intro?: ReactNode;
}

const DEFAULT_INTRO = (
  <>
    チームみらいに関わる政治資金の流れは、まるごとここに反映されています。
    <span className="hidden sm:inline">
      <br />
    </span>
    私たちがなぜここまでオープンにするのか、
  </>
);

export default function TransparencySection({
  title,
  intro = DEFAULT_INTRO,
}: TransparencySectionProps) {
  return (
    <div className="flex items-center self-stretch bg-gradient-to-br from-[#64D8C6] to-[#BCECD3] rounded-[22px] p-8 sm:p-12">
      <div className="flex flex-col justify-center gap-2 sm:gap-[10.84px]">
        <div className="flex">
          <h2 className="text-xl sm:text-[27px] font-bold leading-[1.5] tracking-[0.01em] text-gray-800 font-japanese">
            {title}
          </h2>
        </div>
        <p className="text-xs sm:text-base font-normal leading-[1.667] sm:leading-[1.75] tracking-[0.01em] text-gray-800 font-japanese max-w-[874px]">
          {intro}
          その理由は
          <a
            href="https://note.com/team_mirai_jp/n/n58fca6f9e4e8"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold underline hover:no-underline"
          >
            こちらのnote
          </a>
          をお読みください。
        </p>
      </div>
    </div>
  );
}
