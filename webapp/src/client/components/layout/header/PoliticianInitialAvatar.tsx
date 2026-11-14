interface PoliticianInitialAvatarProps {
  name: string;
  size: "sm" | "lg";
}

/** ヘッダーのメニューで議員名の左に置く、名前の1文字目の丸いアイコン。 */
export default function PoliticianInitialAvatar({ name, size }: PoliticianInitialAvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[#E2F6F3] font-bold text-[#0F8472] ${
        size === "lg" ? "size-11 text-lg" : "size-7 text-[11px]"
      }`}
    >
      {name.slice(0, 1)}
    </span>
  );
}
