interface Props {
  /** 見出しの id。セクションの aria-labelledby から参照する */
  id: string;
  title: string;
  description: string;
}

/**
 * トップページのセクション見出し（「所属議員の調研費」「議員の政治団体」）と、その下の説明文（v9）。
 * 書体は v9 と同じくヒラギノ角ゴ ProN を先に当て、無ければ Noto Sans JP の 900 で描く（既定の system-ui だと細く見える）。
 */
export default function HomeSectionHeading({ id, title, description }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <h2
        id={id}
        className="m-0 break-keep [font-family:'Hiragino_Kaku_Gothic_ProN',var(--font-noto-sans-jp),'Noto_Sans_JP',system-ui,sans-serif] text-[clamp(30px,4.1vw,58px)] font-black leading-[1.18] tracking-[0.01em] [font-feature-settings:'palt'] [overflow-wrap:anywhere]"
      >
        {title}
      </h2>
      <p className="m-0 max-w-[40em] text-[14px] font-medium leading-[1.85] text-[#4B5563] min-[641px]:text-[15px]">
        {description}
      </p>
    </div>
  );
}
