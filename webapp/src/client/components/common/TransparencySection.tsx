import "server-only";
import GradientMessageCard from "@/client/components/common/GradientMessageCard";

interface TransparencySectionProps {
  title: string;
}

export default function TransparencySection({ title }: TransparencySectionProps) {
  return (
    <GradientMessageCard title={title}>
      チームみらいに関わる政治資金の流れは、まるごとここに反映されています。
      <span className="hidden sm:inline">
        <br />
      </span>
      私たちがなぜここまでオープンにするのか、 その理由は
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
