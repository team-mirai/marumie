import "server-only";
import { ImageResponse } from "next/og";
import { loadOrganizations } from "@/server/contexts/public-finance/presentation/loaders/load-organizations";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "みらいまる見え政治資金";

const SITE_NAME = "みらいまる見え政治資金";
const FALLBACK_ORG_NAME = "政治資金の流れを、まる見えに";
const CAPTION = "収入・支出・残高のすべてを公開しています";

/**
 * Satori（next/og）は next/font を利用できず、フォントのバイナリを直接渡す必要がある。
 * 画像に描画する文字だけを Google Fonts の `text` パラメータでサブセット取得することで、
 * 数MBある Noto Sans JP 全体をダウンロードせずに済ませている。
 */
async function loadJapaneseFont(text: string): Promise<ArrayBuffer | null> {
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700&text=${encodeURIComponent(text)}`;
    // User-Agent を送らない場合のみ Google Fonts は truetype を返す。
    // ブラウザ相当の User-Agent を送ると woff2 が返るが、Satori は woff2 を解釈できない。
    const cssResponse = await fetch(cssUrl);
    if (!cssResponse.ok) return null;

    const css = await cssResponse.text();
    const fontUrl = css.match(/src:\s*url\((https:\/\/[^)]+)\)\s*format\('truetype'\)/)?.[1];
    if (!fontUrl) return null;

    const fontResponse = await fetch(fontUrl);
    if (!fontResponse.ok) return null;

    return await fontResponse.arrayBuffer();
  } catch {
    // フォント取得に失敗しても OGP 画像自体は返せるようにする
    return null;
  }
}

interface OgImageProps {
  params: Promise<{ slug: string; year: string }>;
}

export default async function OpengraphImage({ params }: OgImageProps) {
  const { slug, year } = await params;

  let orgName = FALLBACK_ORG_NAME;
  try {
    const { organizations } = await loadOrganizations();
    const organization = organizations.find((org) => org.slug === slug);
    if (organization?.displayName) {
      orgName = organization.displayName;
    }
  } catch {
    // 組織名が引けない場合もフォールバック文言で画像を返す
  }

  // 画像に描画する文字をすべてサブセットに含める。
  // 含め漏れがあるとその文字だけ別フォントで描画され、字面が揃わない。
  const fontData = await loadJapaneseFont(
    `${orgName}${SITE_NAME}${CAPTION}${FALLBACK_ORG_NAME}${year}年度の収支`,
  );

  // Satori は最低1つのフォントを要求するため、フォント取得に失敗した場合は
  // テキストを持たないブランド画像を返す（500 を返さない）
  if (!fontData) {
    return new ImageResponse(
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundImage: "linear-gradient(135deg, #d7f5ee 0%, #ffffff 55%, #eafaf6 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 320,
            height: 16,
            backgroundColor: "#30bca7",
            borderRadius: 8,
          }}
        />
      </div>,
      size,
    );
  }

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 80px",
        backgroundImage: "linear-gradient(135deg, #d7f5ee 0%, #ffffff 55%, #eafaf6 100%)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            fontSize: 30,
            letterSpacing: "0.08em",
            color: "#238778",
          }}
        >
          {SITE_NAME}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 12,
            width: 96,
            height: 8,
            backgroundColor: "#30bca7",
            borderRadius: 4,
          }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            fontSize: orgName.length > 16 ? 66 : 84,
            lineHeight: 1.25,
            color: "#000000",
          }}
        >
          {orgName}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 24,
            fontSize: 38,
            color: "#4b5563",
          }}
        >
          {year}年度の収支
        </div>
      </div>

      <div
        style={{
          display: "flex",
          fontSize: 26,
          color: "#6b7280",
        }}
      >
        {CAPTION}
      </div>
    </div>,
    {
      ...size,
      fonts: [{ name: "Noto Sans JP", data: fontData, style: "normal", weight: 700 }],
    },
  );
}
