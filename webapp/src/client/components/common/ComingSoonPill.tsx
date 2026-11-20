interface Props {
  className?: string;
}

/**
 * 調研費を「準備中」の議員の名前の横に添える、グレーの小さなタグ（デザイン v9 の .mt-soon-tag）。
 * 大きさ・色を場所ごとに変えるときは className で上書きする。
 */
export default function ComingSoonPill({ className = "" }: Props) {
  return (
    <span
      className={`inline-flex h-5 flex-none items-center whitespace-nowrap rounded-full bg-[#F1F3F2] px-2 align-middle text-[11px] font-bold leading-none tracking-[0.02em] text-[#5B6563] ${className}`}
    >
      準備中
    </span>
  );
}
