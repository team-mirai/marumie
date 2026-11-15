import Image from "next/image";

/** 政党の見出しカードの丸に入れる、チームみらいのロゴ */
export default function PartyLogo() {
  return (
    <Image
      src="/logos/team-mirai-logo.svg"
      alt="チームみらいのロゴ"
      width={56}
      height={56}
      className="h-auto w-[76%]"
    />
  );
}
