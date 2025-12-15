import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./styles.css";

export const metadata: Metadata = {
  title: "政治資金ダッシュボード管理画面",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
