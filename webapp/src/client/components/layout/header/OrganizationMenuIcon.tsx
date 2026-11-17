import OrganizationAvatar from "@/client/components/home/OrganizationAvatar";

interface OrganizationMenuIconProps {
  slug: string;
  /** 代表者の顔写真を配信できるか。false なら人型のアイコンにする */
  hasPhoto: boolean;
  /** 顔写真の丸に白い縁取りを付けるか（フッターの緑の背景の上に置くとき） */
  ringed?: boolean;
}

/**
 * SP メニューやフッターで団体名の左に置く 32px のアイコン（デザイン v9 の `.mm-av`）。
 * 政党も政治団体も、admin で登録した代表者の顔写真の丸（未登録なら人型のアイコン）にする。
 */
export default function OrganizationMenuIcon({
  slug,
  hasPhoto,
  ringed = false,
}: OrganizationMenuIconProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#E2F6F3]${ringed ? " shadow-[0_0_0_2px_#fff]" : ""}`}
    >
      <OrganizationAvatar slug={slug} alt="" hasPhoto={hasPhoto} />
    </span>
  );
}
