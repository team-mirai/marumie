import type { Metadata } from "next";
import { Noto_Sans, Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { GoogleAnalytics } from "@next/third-parties/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Footer from "@/client/components/layout/footer/Footer";
import Header from "@/client/components/layout/header/Header";

// Noto Sans JP for Japanese text with proper weights
const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
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

export const metadata: Metadata = {
  title: "みらい まる見え政治資金 - チームみらいの政治資金をオープンに",
  description: "チームみらいの政治資金の流れを透明性を持って公開するプラットフォームです。",
  openGraph: {
    title: "みらい まる見え政治資金 - チームみらいの政治資金をオープンに",
    description: "チームみらいの政治資金の流れを透明性を持って公開するプラットフォームです。",
    images: [
      {
        url: "/social/og_image.png",
        width: 1200,
        height: 630,
        alt: "みらい まる見え政治資金",
      },
    ],
    type: "website",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "みらい まる見え政治資金 - チームみらいの政治資金をオープンに",
    description: "チームみらいの政治資金の流れを透明性を持って公開するプラットフォームです。",
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
        className={`${notoSans.variable} ${notoSansJP.variable} antialiased pt-24 flex flex-col min-h-screen`}
      >
        <Header />
        <div className="flex-grow">{children}</div>
        <div className="mt-0 sm:mt-16">
          <Footer />
        </div>
        <SpeedInsights sampleRate={0.1} />
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_TRACKING_ID || ""} />
      </body>
    </html>
  );
}
