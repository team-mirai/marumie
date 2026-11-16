import "server-only";
import GradientMessageCard from "@/client/components/common/GradientMessageCard";
import NewTabMark from "@/client/components/common/NewTabMark";

const VARIANTS = {
  party: {
    title: "党首もこれを見て、お金をやりくりしています",
    emoji: "👀",
    linkText: "チームみらいのnoteの記事",
  },
  transactions: {
    title: "党内の機密データの流出事故ではありません",
    emoji: "☺️",
    linkText: "こちらのnote",
  },
} as const;

interface TransparencySectionProps {
  /** 政党ページは "party"、すべての出入金ページは "transactions"。見出しとリンクの文言が変わる */
  variant: keyof typeof VARIANTS;
}

/** 政治資金をまるごと公開する理由を note へ案内する一言コメントの帯。 */
export default function TransparencySection({ variant }: TransparencySectionProps) {
  const { title, emoji, linkText } = VARIANTS[variant];
  return (
    <GradientMessageCard title={title} emoji={emoji}>
      チームみらいに関わる政治資金の流れは、まるごとここに反映されています。
      <span className="hidden min-[641px]:inline">
        <br />
      </span>
      私たちがなぜここまでオープンにするのか、 その理由は
      <a
        href="https://note.com/team_mirai_jp/n/n58fca6f9e4e8"
        target="_blank"
        rel="noopener noreferrer"
        className="font-bold underline hover:no-underline"
      >
        {linkText}
        <NewTabMark />
      </a>
      をお読みください。
    </GradientMessageCard>
  );
}
