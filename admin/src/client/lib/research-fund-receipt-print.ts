import { degrees, PDFDocument, type PDFFont, type PDFPage, rgb, StandardFonts } from "pdf-lib";

/**
 * 議員課に提出する領収書の印刷用 PDF をブラウザで組み立てる（#1777）。
 *
 * - 用紙は A4 縦。上端の余白に領収書等番号（複数ページの書類は何ページ中の何ページ目か）を印字する
 * - 書類は印字の帯より下の枠に、縦横比を保って収まるように縮小して置く（拡大はしない）。印字と書類は重ならない
 * - 画像は 1 ページ、PDF は全ページを元の順に入れる
 * - 取得できない・読めない書類は欠落させず、その番号を印字した「読めなかった」旨のページを入れる
 * - 日本語フォントを埋め込まずに済むよう、印字は英数字だけにする
 */

/** A4 縦（pt） */
export const A4_WIDTH = 595.28;
export const A4_HEIGHT = 841.89;
const MARGIN = 28;
/** 領収書等番号を印字する上端の帯の高さ */
const LABEL_BAND = 36;
const LABEL_SIZE = 14;

/** 書類を置く枠（印字の帯より下） */
export const CONTENT_BOX = {
  x: MARGIN,
  y: MARGIN,
  width: A4_WIDTH - MARGIN * 2,
  height: A4_HEIGHT - MARGIN * 2 - LABEL_BAND,
} as const;

interface Placement {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  /** pdf-lib の drawPage / drawImage に渡す回転（反時計回りの度数） */
  readonly rotate: number;
}

/**
 * 幅 width × 高さ height の書類を、表示上の回転 rotation（PDF の /Rotate。時計回り）を反映して枠に収める位置。
 * 縦横比を保ち、拡大はしない。横は中央、縦は枠の上端に寄せる
 */
export function placeInBox(
  width: number,
  height: number,
  rotation = 0,
  box: { x: number; y: number; width: number; height: number } = CONTENT_BOX,
): Placement {
  const normalized = (((Math.round(rotation / 90) * 90) % 360) + 360) % 360;
  const sideways = normalized === 90 || normalized === 270;
  const shownWidth = sideways ? height : width;
  const shownHeight = sideways ? width : height;
  const scale = Math.min(box.width / shownWidth, box.height / shownHeight, 1);
  const left = box.x + (box.width - shownWidth * scale) / 2;
  const bottom = box.y + box.height - shownHeight * scale;
  // 回転は描画の原点（左下）を中心にかかるので、回転後に枠の左下へ来るよう原点をずらす
  switch (normalized) {
    case 90:
      return { x: left, y: bottom + width * scale, scale, rotate: -90 };
    case 180:
      return { x: left + width * scale, y: bottom + height * scale, scale, rotate: 180 };
    case 270:
      return { x: left + height * scale, y: bottom, scale, rotate: 90 };
    default:
      return { x: left, y: bottom, scale, rotate: 0 };
  }
}

/** 余白に印字する文字列。英数字だけにする */
export function receiptLabel(receiptNumber: number, page: number, pageCount: number): string {
  const label = `Receipt No. ${receiptNumber}`;
  return pageCount > 1 ? `${label}  (page ${page} / ${pageCount})` : label;
}

export interface ReceiptPrintItem {
  readonly receiptNumber: number;
  readonly mime: string | null;
  readonly url: string | null;
}

interface ReceiptPrintResult {
  readonly bytes: Uint8Array;
  /** 取得できない・読めなかった書類の領収書等番号（PDF には読めなかった旨のページを入れてある） */
  readonly failedReceiptNumbers: readonly number[];
}

type FileKind = "pdf" | "jpeg" | "png";

/** 中身の先頭バイトで種類を判定し、分からなければ MIME に従う */
function detectKind(bytes: Uint8Array, mime: string | null): FileKind | null {
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46)
    return "pdf";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47)
    return "png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "jpeg";
  if (mime === "application/pdf") return "pdf";
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpeg";
  return null;
}

/**
 * JPEG の EXIF Orientation が表す、正しい向きで表示するための回転（時計回りの度数）。
 * 鏡像の指定（2・4・5・7。カメラではまず使われない）と、読めない場合は 0
 */
export function jpegExifRotation(bytes: Uint8Array): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 2;
  while (offset + 4 <= bytes.length && bytes[offset] === 0xff) {
    const marker = bytes[offset + 1];
    // SOS 以降は画像データなので、メタデータはそれより前にしかない
    if (marker === 0xda) return 0;
    const length = view.getUint16(offset + 2);
    const start = offset + 4;
    if (
      marker === 0xe1 &&
      start + 14 <= bytes.length &&
      String.fromCharCode(...bytes.subarray(start, start + 4)) === "Exif"
    ) {
      return orientationToRotation(readTiffOrientation(view, start + 6));
    }
    offset = start + length - 2;
  }
  return 0;
}

function readTiffOrientation(view: DataView, tiff: number): number {
  try {
    const little = view.getUint16(tiff) === 0x4949;
    const ifd = tiff + view.getUint32(tiff + 4, little);
    const count = view.getUint16(ifd, little);
    for (let i = 0; i < count; i++) {
      const entry = ifd + 2 + i * 12;
      if (view.getUint16(entry, little) === 0x0112) return view.getUint16(entry + 8, little);
    }
  } catch {
    // 壊れた EXIF は向きの指定が無いものとして扱う
  }
  return 1;
}

function orientationToRotation(orientation: number): number {
  switch (orientation) {
    case 3:
      return 180;
    case 6:
      return 90;
    case 8:
      return 270;
    default:
      return 0;
  }
}

function drawLabel(page: PDFPage, font: PDFFont, text: string) {
  const width = font.widthOfTextAtSize(text, LABEL_SIZE);
  page.drawText(text, {
    x: A4_WIDTH - MARGIN - width,
    y: A4_HEIGHT - MARGIN - LABEL_SIZE,
    size: LABEL_SIZE,
    font,
    color: rgb(0, 0, 0),
  });
}

function addFailurePage(output: PDFDocument, font: PDFFont, receiptNumber: number) {
  const page = output.addPage([A4_WIDTH, A4_HEIGHT]);
  drawLabel(page, font, receiptLabel(receiptNumber, 1, 1));
  const lines = [
    `Receipt No. ${receiptNumber} could not be loaded.`,
    "Please open the original document in the admin screen and print it separately.",
  ];
  lines.forEach((line, i) => {
    page.drawText(line, {
      x: MARGIN,
      y: A4_HEIGHT / 2 - i * 20,
      size: 12,
      font,
      color: rgb(0.6, 0, 0),
    });
  });
}

async function addDocument(
  output: PDFDocument,
  font: PDFFont,
  item: ReceiptPrintItem,
  bytes: Uint8Array,
) {
  const kind = detectKind(bytes, item.mime);
  if (kind === null) throw new Error("対応していない形式の書類です");
  if (kind === "pdf") {
    const source = await PDFDocument.load(bytes, { ignoreEncryption: true });
    // pdf-lib は復号できず、そのまま埋め込むと中身が読めないページになるので、読めなかった書類として扱う
    if (source.isEncrypted) throw new Error("暗号化された PDF です");
    const sourcePages = source.getPages();
    if (sourcePages.length === 0) throw new Error("ページのない PDF です");
    for (const [i, sourcePage] of sourcePages.entries()) {
      const target = output.addPage([A4_WIDTH, A4_HEIGHT]);
      // 中身の無い（白紙の）ページは埋め込めないので、番号だけを印字したページにする
      if (sourcePage.node.Contents() !== undefined) {
        const page = await output.embedPage(sourcePage);
        const placement = placeInBox(page.width, page.height, sourcePage.getRotation().angle);
        target.drawPage(page, {
          x: placement.x,
          y: placement.y,
          xScale: placement.scale,
          yScale: placement.scale,
          rotate: degrees(placement.rotate),
        });
      }
      drawLabel(target, font, receiptLabel(item.receiptNumber, i + 1, sourcePages.length));
    }
    return;
  }
  const image = kind === "png" ? await output.embedPng(bytes) : await output.embedJpg(bytes);
  // pdf-lib は EXIF の向きを反映しないので、ブラウザでの表示と同じ向きになるよう回転して置く
  const rotation = kind === "jpeg" ? jpegExifRotation(bytes) : 0;
  const placement = placeInBox(image.width, image.height, rotation);
  const target = output.addPage([A4_WIDTH, A4_HEIGHT]);
  target.drawImage(image, {
    x: placement.x,
    y: placement.y,
    width: image.width * placement.scale,
    height: image.height * placement.scale,
    rotate: degrees(placement.rotate),
  });
  drawLabel(target, font, receiptLabel(item.receiptNumber, 1, 1));
}

/** 原本を同時に取得する数。取得を先回りしつつ、ブラウザのメモリを使いすぎない */
const FETCH_CONCURRENCY = 4;

/**
 * 書類を並び順のまま 1 つの PDF にする。fetchBytes が失敗した・読めなかった書類は、読めなかった旨のページにする。
 * onProgress には処理し終えた件数を渡す
 */
export async function buildReceiptPrintPdf(
  items: readonly ReceiptPrintItem[],
  fetchBytes: (url: string) => Promise<Uint8Array>,
  onProgress?: (done: number) => void,
): Promise<ReceiptPrintResult> {
  const output = await PDFDocument.create();
  const font = await output.embedFont(StandardFonts.Helvetica);
  const failed: number[] = [];
  const fetchItem = (item: ReceiptPrintItem): Promise<Uint8Array | null> =>
    item.url === null ? Promise.resolve(null) : fetchBytes(item.url).catch(() => null);
  for (let start = 0; start < items.length; start += FETCH_CONCURRENCY) {
    const chunk = items.slice(start, start + FETCH_CONCURRENCY);
    const fetched = await Promise.all(chunk.map(fetchItem));
    for (const [i, item] of chunk.entries()) {
      const bytes = fetched[i];
      // 読み込みの途中で失敗しても、それまでに追加したページを残さないよう、ページ数を覚えて戻す
      const pageCount = output.getPageCount();
      try {
        if (bytes === null) throw new Error("書類を取得できませんでした");
        await addDocument(output, font, item, bytes);
      } catch {
        while (output.getPageCount() > pageCount) output.removePage(output.getPageCount() - 1);
        addFailurePage(output, font, item.receiptNumber);
        failed.push(item.receiptNumber);
      }
      onProgress?.(start + i + 1);
    }
  }
  return { bytes: await output.save(), failedReceiptNumbers: failed };
}
