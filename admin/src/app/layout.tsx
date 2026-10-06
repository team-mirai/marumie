import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "@/client/components/ui";
import { buildAdminPageTitle, DEPLOY_TARGET_ENV } from "@/client/lib/deploy-environment";
import "./globals.css";

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: buildAdminPageTitle(DEPLOY_TARGET_ENV),
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={poppins.variable}>
      <body>
        {children}
        <Toaster />
        <SpeedInsights />
      </body>
    </html>
  );
}
