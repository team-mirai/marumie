interface Props {
  /** 例: 「宇佐美登の調研費・2026年」 */
  eyebrow: string;
  /** 添え書き。無ければ null */
  note: string | null;
}

/**
 * 調研費が「準備中」の議員のページで、収支の流れ以下の代わりに出す点線の枠（デザイン v9 の議員ページ・準備中）。
 */
export default function ResearchFundComingSoonSection({ eyebrow, note }: Props) {
  return (
    <section
      data-reveal
      aria-label="調研費のデータ"
      className="flex flex-col items-center gap-3 rounded-[24px] bg-white p-[clamp(20px,4vw,48px)] text-center min-[641px]:rounded-[32px]"
    >
      <div className="flex w-full flex-col items-center gap-3 rounded-[20px] px-5 py-12 outline-dashed outline-[1.5px] -outline-offset-[1.5px] outline-[#B8C1BE]">
        <span className="text-[13px] font-bold leading-[1.4] tracking-[0.04em] text-[#238778]">
          {eyebrow}
        </span>
        <h2 className="m-0 break-keep text-[clamp(24px,2.8vw,36px)] font-bold leading-[1.3] tracking-[0.01em] text-black [overflow-wrap:anywhere]">
          調研費のデータは公開準備中です
        </h2>
        <p className="m-0 max-w-[36em] text-[15px] leading-[1.87] text-[#4B5563]">
          収支の流れ・活用方針と主な用途・月ごとの推移・すべての出入金は、準備ができしだいこのページで公開します。
        </p>
        {note && (
          <p className="m-0 max-w-[36em] text-[13px] font-medium leading-[1.6] text-[#4B5563] [overflow-wrap:anywhere] [word-break:keep-all]">
            {note}
          </p>
        )}
      </div>
    </section>
  );
}
