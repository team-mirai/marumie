import type { Metadata } from "next";
import { Noto_Sans, Noto_Sans_JP, Poppins } from "next/font/google";
import "./globals.css";
import { GoogleAnalytics } from "@next/third-parties/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Footer from "@/client/components/layout/footer/Footer";
import Header from "@/client/components/layout/header/Header";

// Noto Sans JP for Japanese text with proper weights
const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  // 800：サンキー図のラベルなど。読み込まないと 900 で描かれ、デザインより太くなる
  weight: ["400", "500", "700", "800", "900"],
  display: "swap",
  style: ["normal"],
});

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "700", "800", "900"],
  display: "swap",
  preload: true,
});

// 見出しカードの金額の数字（v9 の --num）。太さは 700 だけ使う
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
});

const SITE_TITLE = "まる見え政治資金｜チームみらい";
const SITE_DESCRIPTION =
  "チームみらいの政治資金と、所属議員の調研費の使い道を、だれでもいつでも確かめられるツールです。";

export const metadata: Metadata = {
  // 下層ページは「チームみらいの収支｜まる見え政治資金｜チームみらい」のように、ページ名を前に付ける
  title: { default: SITE_TITLE, template: `%s｜${SITE_TITLE}` },
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/social/og_image.png",
        width: 1200,
        height: 630,
        alt: "まる見え政治資金",
      },
    ],
    type: "website",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/social/og_image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head />
      <body
        className={`${notoSans.variable} ${notoSansJP.variable} ${poppins.variable} antialiased pt-24 flex flex-col min-h-screen`}
      >
        <Header />
        <div className="flex-grow">{children}</div>
        <div className="mt-0 min-[641px]:mt-16">
          <Footer />
        </div>
        <SpeedInsights sampleRate={0.1} />
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_TRACKING_ID || ""} />
      </body>
    </html>
  );
}
