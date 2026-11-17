import type { Metadata } from "next";
import { TOP_OG_IMAGE_PATH } from "@/app/_og-image/og-frame";

export const SITE_TITLE = "まる見え政治資金｜チームみらい";
export const SITE_DESCRIPTION =
  "チームみらいの政治資金と、所属議員の調研費の使い道を、だれでもいつでも確かめられるツールです。";

/**
 * シェアしたときのカード（og:* と twitter:*）。画像はページごとに差し替え、文言はサイト共通にする。
 * ページの metadata で openGraph を書くとルートの openGraph がまるごと置き換わるため、文言もいっしょに渡す。
 * 画像を指定しなければトップの画像（個別の画像を持たないページの既定）にする。
 */
export function shareMetadata(
  image: { url: string; alt: string } = { url: TOP_OG_IMAGE_PATH, alt: "まる見え政治資金" },
): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: {
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      images: [{ url: image.url, width: 1200, height: 630, alt: image.alt }],
      type: "website",
      locale: "ja_JP",
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      images: [{ url: image.url, alt: image.alt }],
    },
  };
}
