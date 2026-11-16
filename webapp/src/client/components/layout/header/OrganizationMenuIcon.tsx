import Image from "next/image";
import OrganizationAvatar from "@/client/components/home/OrganizationAvatar";

interface OrganizationMenuIconProps {
  slug: string;
  /** 政党ならチームみらいのロゴ、それ以外の政治団体なら代表者の顔写真 */
  kind: "party" | "group";
  /** 代表者の顔写真を配信できるか。false なら人型のアイコンにする */
  hasPhoto: boolean;
  /** 顔写真の丸に白い縁取りを付けるか（フッターの緑の背景の上に置くとき） */
  ringed?: boolean;
}

/**
 * SP メニューやフッターで団体名の左に置く 32px のアイコン（デザイン v9 の `.mm-lg`・`.mm-av`）。
 * 政党はロゴ（32px の枠に高さ 28px）、それ以外の政治団体は代表者の顔写真の丸にする。
 */
export default function OrganizationMenuIcon({
  slug,
  kind,
  hasPhoto,
  ringed = false,
}: OrganizationMenuIconProps) {
  if (kind === "party") {
    return (
      <span aria-hidden="true" className="inline-flex size-8 shrink-0 items-center justify-center">
        <Image
          src="/logos/team-mirai-logo.svg"
          alt=""
          width={33}
          height={28}
          className="block h-7 w-auto"
        />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#E2F6F3]${ringed ? " shadow-[0_0_0_2px_#fff]" : ""}`}
    >
      <OrganizationAvatar slug={slug} alt="" hasPhoto={hasPhoto} />
    </span>
  );
}
