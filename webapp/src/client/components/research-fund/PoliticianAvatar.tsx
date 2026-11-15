import Image from "next/image";

interface Props {
  /** 顔写真の URL。未登録なら null（人型のアイコンにする） */
  photoUrl: string | null;
  /** 読み上げ名（例: 「峰島侑也の写真」） */
  alt: string;
  /** 大きさ（Tailwind の h-/w- クラス） */
  className: string;
}

/** 議員の丸い顔写真。写真が未登録なら人型のアイコンにする。 */
export default function PoliticianAvatar({ photoUrl, alt, className }: Props) {
  return (
    <span
      className={`relative flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#CFEFE7] ${className}`}
    >
      {photoUrl ? (
        // 写真は署名URLへのリダイレクトで配信するので、Next の画像最適化を通さない
        <Image src={photoUrl} alt={alt} fill unoptimized sizes="88px" className="object-cover" />
      ) : (
        <svg
          role="img"
          aria-label={alt}
          viewBox="0 0 24 24"
          className="h-[62%] w-[62%] translate-y-[8%] text-[#2AA693]"
          fill="currentColor"
        >
          <circle cx="12" cy="8" r="4.2" />
          <path d="M3.5 21.5c.6-4.6 4.1-7.6 8.5-7.6s7.9 3 8.5 7.6z" />
        </svg>
      )}
    </span>
  );
}
