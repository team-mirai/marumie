import "server-only";
import type { ReactNode } from "react";
import GradientMessageCard from "@/client/components/common/GradientMessageCard";

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
    <GradientMessageCard title={title}>
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
    </GradientMessageCard>
  );
}
