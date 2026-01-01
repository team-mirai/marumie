import * as iconv from "iconv-lite";

export function bufferToString(buffer: Buffer): string {
  const shiftJisContent = iconv.decode(buffer, "shift_jis");

  if (
    shiftJisContent.includes("取引") ||
    shiftJisContent.includes("借方") ||
    shiftJisContent.includes("貸方") ||
    shiftJisContent.includes("寄付者")
  ) {
    return shiftJisContent;
  }

  return buffer.toString("utf8");
}
