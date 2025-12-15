import "server-only";
import Image from "next/image";
import Link from "next/link";
import CardHeader from "@/client/components/layout/CardHeader";
import MainColumnCard from "@/client/components/layout/MainColumnCard";
import MainButton from "@/client/components/ui/MainButton";
import type { DonationSummaryData } from "@/server/usecases/get-daily-donation-usecase";
import DonationChart from "./features/charts/DonationChart";
import DonationSummaryCards from "./features/donation-summary/DonationSummaryCards";

interface DonationSummarySectionProps {
  donationSummary?: DonationSummaryData;
}

export default function DonationSummarySection({ donationSummary }: DonationSummarySectionProps) {
  // サーバーサイドで計算された統計情報を使用
  const totalDonationAmount = donationSummary?.totalAmount || 0;
  const dayOverDayChange = donationSummary?.amountDayOverDay || 0;
  const dailyDonationData = donationSummary?.dailyDonationData || [];

  // DonationSection専用のupdatedAt表示フォーマット
  const formatDonationUpdatedAt = (dateString: string | null): string => {
    if (!dateString) return "仕分け中";

    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    return `${year}.${month}.${day}時点で仕分け済`;
  };

  const donationUpdatedAt = formatDonationUpdatedAt(
    donationSummary?.lastNonZeroDonationDate || null,
  );

  // 金額を億・万・円に分解する関数
  const formatLargeAmount = (amount: number) => {
    const oku = Math.floor(amount / 100000000); // 億
    const man = Math.floor((amount % 100000000) / 10000); // 万
    const en = amount % 10000; // 円

    return { oku, man, en };
  };

  const { oku: totalOku, man: totalMan, en: totalEn } = formatLargeAmount(totalDonationAmount);

  return (
    <MainColumnCard id="donation-summary">
      <CardHeader
        icon={
          <Image
            src="/icons/icon-heart-handshake.svg"
            alt="Heart handshake icon"
            width={30}
            height={30}
          />
        }
        title="これまでの累計寄附金額"
        updatedAt={donationUpdatedAt}
        subtitle="いただいた寄附総額と直近3ヶ月の推移"
      />

      {/* 寄附統計サマリー */}
      <DonationSummaryCards
        totalOku={totalOku}
        totalMan={totalMan}
        totalEn={totalEn}
        dayOverDayChange={dayOverDayChange}
      />

      {/* 寄附推移グラフ */}
      <DonationChart data={dailyDonationData} />

      {/* 寄附メッセージとボタン */}
      <div className="bg-white rounded-lg px-8 text-center">
        <p className="text-gray-800 font-bold text-base leading-7 mb-6">
          チームみらいは、皆さまのご支援・ご寄附のおかげで活動を続けられております。
        </p>
        <Link href="https://team-mir.ai/support/donation" target="_blank" rel="noopener">
          <MainButton>ご寄附はこちら</MainButton>
        </Link>
      </div>
    </MainColumnCard>
  );
}
