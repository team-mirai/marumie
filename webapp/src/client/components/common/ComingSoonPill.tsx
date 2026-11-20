interface Props {
  className?: string;
}

/** 調研費を「準備中」の議員の名前の横に添える、グレーの小さなラベル */
export default function ComingSoonPill({ className = "" }: Props) {
  return (
    <span
      className={`inline-flex flex-shrink-0 items-center whitespace-nowrap rounded-full bg-[#E9ECEB] px-2 py-[3px] text-[12px] font-bold leading-none tracking-normal text-[#4B5563] ${className}`}
    >
      準備中
    </span>
  );
}
