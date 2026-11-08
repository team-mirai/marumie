import type { Metadata } from "next";
import Link from "next/link";
import MainColumn from "@/client/components/layout/MainColumn";
import MainColumnCard from "@/client/components/layout/MainColumnCard";

export const metadata: Metadata = {
  title: "ページが見つかりません | みらいまる見え政治資金",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <MainColumn>
      <MainColumnCard className="flex flex-col items-center justify-center py-16 text-center">
        <span className="text-6xl font-extrabold tracking-tight text-slate-600 font-sans">404</span>
        <h1 className="mt-4 text-2xl font-bold text-[#1F2937] font-japanese sm:text-3xl">
          ページが見つかりません
        </h1>
        <p className="mt-4 max-w-md text-sm text-gray-600 font-japanese sm:text-base">
          お探しのページは存在しないか、移動または削除された可能性があります。
          入力したURLに間違いがないかご確認ください。
        </p>
        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center justify-center h-[48px] px-6 py-2 bg-white border border-[#1F2937] rounded-[6px] text-[#1F2937] font-bold text-base hover:bg-gray-50 transition-colors"
          >
            トップページへ戻る
          </Link>
        </div>
      </MainColumnCard>
    </MainColumn>
  );
}
