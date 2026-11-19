import Image from "next/image";

interface PoliticianInitialAvatarProps {
  name: string;
  /** 顔写真の URL。未登録なら null（名前の1文字目にする） */
  photoUrl: string | null;
  /** lg: 44px（メガメニュー） / face: 52px（SP メニューの顔写真） / footer: 32px（フッターのサイトマップ。白い縁取り付き） */
  size: "lg" | "face" | "footer";
}

const SIZE_CLASSES: Record<PoliticianInitialAvatarProps["size"], string> = {
  lg: "size-11 text-lg",
  face: "size-[52px] text-xl",
  footer: "size-8 text-sm shadow-[0_0_0_2px_#fff]",
};

/** ヘッダーのメニューやフッターで議員名の左に置く丸いアイコン。顔写真が無ければ名前の1文字目にする。 */
export default function PoliticianInitialAvatar({
  name,
  photoUrl,
  size,
}: PoliticianInitialAvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#E2F6F3] font-bold text-[#0F8472] ${SIZE_CLASSES[size]}`}
    >
      {photoUrl ? (
        // 写真は署名URLへのリダイレクトで配信するので、Next の画像最適化を通さない
        <Image src={photoUrl} alt="" fill unoptimized sizes="52px" className="object-cover" />
      ) : (
        name.slice(0, 1)
      )}
    </span>
  );
}
