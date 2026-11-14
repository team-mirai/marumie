"use client";
import "client-only";
import { useEffect, useRef, useState } from "react";

interface OrganizationAvatarProps {
  slug: string;
  /** 代表者の写真の読み上げ名 */
  alt: string;
  /** 写真を配信できるか。false なら人型のアイコンにする */
  hasPhoto: boolean;
}

/**
 * 政治団体の見出しカードの丸に入れる、代表者の写真（未登録なら人型のアイコン）。
 * 写真を取得できなかったとき（保存済みの画像が消えた、署名URLの発行に失敗したなど）も人型のアイコンにする。
 */
export default function OrganizationAvatar({ slug, alt, hasPhoto }: OrganizationAvatarProps) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // ハイドレーション前に読み込みが失敗すると onError が呼ばれないため、マウント時にも確かめる
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth === 0) {
      setFailed(true);
    }
  }, []);

  if (!hasPhoto || failed) {
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
      ref={imgRef}
      src={`/api/organizations/${encodeURIComponent(slug)}/photo`}
      alt={alt}
      onError={() => setFailed(true)}
      className="h-full w-full object-cover"
    />
  );
}
