/**
 * 領収書の書類をどう表示するか。
 *
 * admin は JPG・PNG・PDF を受け付けるので、公開ページも画像だけを前提にできない。
 * PDF は画像タグでは描けないため、表示の種類を仕訳のビューに持たせて出し分ける。
 */
export type ResearchFundReceiptKind = "image" | "pdf";

/**
 * 書類の MIME から表示の種類を決める。
 * 画像でも PDF でもない（あるいは MIME が分からない）場合は null を返し、
 * 呼び出し側は埋め込まずに原本を開くリンクだけを出す。
 */
export function receiptKindOf(mime: string | null): ResearchFundReceiptKind | null {
  if (!mime) return null;
  // "application/pdf; charset=binary" のようなパラメータ付きでも判定できるようにする。
  const type = mime.split(";")[0].trim().toLowerCase();
  if (type === "application/pdf") return "pdf";
  if (type.startsWith("image/")) return "image";
  return null;
}
