import "server-only";
import type { Metadata } from "next";
import SiteBottomBlock from "@/client/components/common/SiteBottomBlock";
import Breadcrumbs from "@/client/components/layout/Breadcrumbs";
import MainColumn from "@/client/components/layout/MainColumn";

export const metadata: Metadata = {
  title: "まる見え政治資金とは - みらいまる見え政治資金",
};

/** 「まる見え政治資金とは」ページ。本文（目指していること・4つの特徴など）は作成中なので、案内だけを出す。 */
export default function AboutPage() {
  return (
    <MainColumn spacing="compact">
      <div className="flex flex-col gap-5">
        <Breadcrumbs current="まる見え政治資金とは" />
        <section
          aria-labelledby="about-title"
          className="flex flex-col gap-6 rounded-[32px] bg-white px-[18px] py-7 md:p-[clamp(28px,4.4vw,64px)]"
        >
          <span
            role="note"
            className="inline-flex h-7 items-center self-start whitespace-nowrap rounded-full border border-[#E5C34A] bg-[#FFF7D6] px-3 text-[12px] font-bold text-[#5C4A00]"
          >
            このページは作成中です
          </span>
          <h1
            id="about-title"
            className="m-0 break-keep text-[clamp(24px,2.8vw,36px)] font-black leading-[1.3] tracking-[0.01em] text-black [overflow-wrap:anywhere]"
          >
            まる見え政治資金とは
          </h1>
          <p className="m-0 text-[16px] leading-[1.9] tracking-[0.02em] text-[#374151] [text-wrap:pretty]">
            このサイトが目指していることや特徴をご紹介するページを準備しています。公開まで、いましばらくお待ちください。
          </p>
        </section>
      </div>
      <SiteBottomBlock />
    </MainColumn>
  );
}
