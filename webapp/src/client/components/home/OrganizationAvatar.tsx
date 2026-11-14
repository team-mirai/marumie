interface OrganizationAvatarProps {
  slug: string;
  /** 代表者の写真の読み上げ名 */
  alt: string;
  /** 写真を配信できるか。false なら人型のアイコンにする */
  hasPhoto: boolean;
}

/** 政治団体の見出しカードの丸に入れる、代表者の写真（未登録なら人型のアイコン） */
export default function OrganizationAvatar({ slug, alt, hasPhoto }: OrganizationAvatarProps) {
  if (!hasPhoto) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        className="mt-[18%] h-full w-full text-[#B8C1BE]"
      >
        <circle cx="12" cy="9" r="5" />
        <path d="M2 24c0-6 4.5-9.5 10-9.5S22 18 22 24z" />
      </svg>
    );
  }
  return (
    /* 署名URLへのリダイレクトを返すエンドポイントなので、next/image の最適化は使えない */
    <img
      src={`/api/organizations/${encodeURIComponent(slug)}/photo`}
      alt={alt}
      className="h-full w-full object-cover"
    />
  );
}
