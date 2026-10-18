import "server-only";
import type { RasterImage } from "@/server/contexts/research-fund/domain/models/masking-region";

const ORIENTATION_TAG = 0x0112;
const TYPE_SHORT = 3;

/**
 * JPEG の EXIF Orientation（1〜8）を読む。EXIF が無い・壊れている・値が範囲外のときは 1（回転なし）を返す。
 * スマートフォンの写真は画素を横向きのまま保存し、表示上の向きを Orientation で指示していることが多い。
 */
export function readJpegOrientation(bytes: Uint8Array): number {
  try {
    const orientation = findOrientation(
      new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    );
    return orientation >= 1 && orientation <= 8 ? orientation : 1;
  } catch {
    // 範囲外の読み出し（RangeError）など、壊れた EXIF は無いものとして扱う
    return 1;
  }
}

function findOrientation(view: DataView): number {
  if (view.getUint16(0) !== 0xffd8) return 1;
  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    if (view.getUint8(offset) !== 0xff) return 1;
    const marker = view.getUint8(offset + 1);
    // SOS 以降は画像データなので、EXIF はそれより前にしか無い
    if (marker === 0xda) return 1;
    const length = view.getUint16(offset + 2);
    if (marker === 0xe1 && isExifHeader(view, offset + 4))
      return readTiffOrientation(view, offset + 10);
    offset += 2 + length;
  }
  return 1;
}

/** APP1 の先頭が "Exif\0\0" か */
function isExifHeader(view: DataView, offset: number): boolean {
  return view.getUint32(offset) === 0x45786966 && view.getUint16(offset + 4) === 0;
}

/** TIFF ヘッダーから IFD0 をたどり、Orientation タグの値を読む */
function readTiffOrientation(view: DataView, tiffStart: number): number {
  const byteOrder = view.getUint16(tiffStart);
  if (byteOrder !== 0x4949 && byteOrder !== 0x4d4d) return 1;
  const littleEndian = byteOrder === 0x4949;
  if (view.getUint16(tiffStart + 2, littleEndian) !== 0x002a) return 1;
  const ifdStart = tiffStart + view.getUint32(tiffStart + 4, littleEndian);
  const entryCount = view.getUint16(ifdStart, littleEndian);
  for (let i = 0; i < entryCount; i += 1) {
    const entry = ifdStart + 2 + i * 12;
    if (view.getUint16(entry, littleEndian) !== ORIENTATION_TAG) continue;
    if (view.getUint16(entry + 2, littleEndian) !== TYPE_SHORT) return 1;
    return view.getUint16(entry + 8, littleEndian);
  }
  return 1;
}

/** Orientation に従い、画像を表示上の向きに回転・反転する */
export function applyOrientation(image: RasterImage, orientation: number): RasterImage {
  if (orientation < 2 || orientation > 8) return image;
  const { width: w, height: h } = image;
  // 5〜8 は 90 度単位の回転を含むので幅と高さが入れ替わる
  const swapped = orientation >= 5;
  const width = swapped ? h : w;
  const height = swapped ? w : h;
  // 表示上の座標 (x, y) に置く画素を、元画像のどの座標から取るか
  const source: Record<number, (x: number, y: number) => [number, number]> = {
    2: (x, y) => [w - 1 - x, y],
    3: (x, y) => [w - 1 - x, h - 1 - y],
    4: (x, y) => [x, h - 1 - y],
    5: (x, y) => [y, x],
    6: (x, y) => [y, h - 1 - x],
    7: (x, y) => [w - 1 - y, h - 1 - x],
    8: (x, y) => [w - 1 - y, x],
  };
  const toSource = source[orientation];
  const rgba = new Uint8Array(image.rgba.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [sx, sy] = toSource(x, y);
      const from = (sy * w + sx) * 4;
      rgba.set(image.rgba.subarray(from, from + 4), (y * width + x) * 4);
    }
  }
  return { width, height, rgba };
}
