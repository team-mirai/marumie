import "server-only";

/** ImageResponse に渡すフォント（next/og の fonts と同じ形） */
interface OgFont {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 500 | 700 | 800 | 900;
  style: "normal";
}

export const OG_FONT_JP = "Noto Sans JP";
export const OG_FONT_NUM = "Poppins";

/**
 * Google Fonts から、画像に使う文字だけを含む TrueType のフォントを取る。
 * OGP 画像の生成（satori）は woff2 を読めず、ページの next/font の読み込みも流用できないため、自分で取ってきて渡す。
 * User-Agent を付けずに CSS を頼むと TrueType の URL が返る。取れなければ例外を投げる（呼び出し側でトップの画像に戻す）。
 */
async function loadGoogleFont(
  family: string,
  weight: OgFont["weight"],
  text: string,
): Promise<OgFont> {
  const params = new URLSearchParams({ family: `${family}:wght@${weight}`, text });
  const css = await fetch(`https://fonts.googleapis.com/css2?${params}`, { cache: "force-cache" });
  if (!css.ok)
    throw new Error(
      `Google Fonts の CSS を取得できませんでした（${family} ${weight}: ${css.status}）`,
    );
  const url = (await css.text()).match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
  if (!url)
    throw new Error(`Google Fonts の CSS にフォントの URL がありません（${family} ${weight}）`);
  const font = await fetch(url, { cache: "force-cache" });
  if (!font.ok)
    throw new Error(`フォントを取得できませんでした（${family} ${weight}: ${font.status}）`);
  return { name: family, data: await font.arrayBuffer(), weight, style: "normal" };
}

/**
 * 画像に使う書体をまとめて取る。和文は Noto Sans JP（700・800・900）、金額の数字は Poppins（700）。
 * text には画像に描く文字をすべて渡す（その文字だけのフォントにして軽くする）。
 */
export async function loadOgFonts(text: string): Promise<OgFont[]> {
  const chars = [...new Set(text)].join("");
  return await Promise.all([
    loadGoogleFont(OG_FONT_JP, 700, chars),
    loadGoogleFont(OG_FONT_JP, 800, chars),
    loadGoogleFont(OG_FONT_JP, 900, chars),
    loadGoogleFont(OG_FONT_NUM, 700, "0123456789,"),
  ]);
}
