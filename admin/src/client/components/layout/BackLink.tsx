import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

interface BackLinkProps {
  href: string;
  children: string;
}

/** 詳細・編集画面の左上に置く「← 一覧に戻る」リンク。ページヘッダーの上に配置する。 */
export function BackLink({ href, children }: BackLinkProps) {
  return (
    <div className="mb-4">
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground no-underline transition-colors duration-150 ease-out hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {children}
      </Link>
    </div>
  );
}
