import RevealHeadingText from "@/client/components/common/RevealHeadingText";

interface Props {
  /** 見出しの id。セクションの aria-labelledby から参照する */
  id: string;
  title: string;
  description: string;
}

/**
 * トップページのセクション見出し（「所属議員の調研費」「議員の政治団体」）と、その下の説明文（v9）。
 * 見出しは画面に入るときに下からせり上がり、説明文はフェードインする。
 * 書体はページ全体の指定（Noto Sans JP）を引き継ぎ、900 で描く（v9 と同じ）。
 */
export default function HomeSectionHeading({ id, title, description }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <h2
        id={id}
        data-reveal="mask"
        className="m-0 break-keep text-[clamp(30px,4.1vw,58px)] font-black leading-[1.18] tracking-[0.01em] [font-feature-settings:'palt'] [overflow-wrap:anywhere]"
      >
        <RevealHeadingText>{title}</RevealHeadingText>
      </h2>
      <p
        data-reveal
        className="m-0 max-w-[40em] text-[14px] font-medium leading-[1.85] text-[#4B5563] min-[641px]:text-[15px]"
      >
        {description}
      </p>
    </div>
  );
}
