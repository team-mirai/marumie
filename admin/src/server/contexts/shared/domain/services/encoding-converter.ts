import * as iconv from "iconv-lite";

export function bufferToString(buffer: Buffer): string {
  try {
    const shiftJisContent = iconv.decode(buffer, "shift_jis");

    if (
      shiftJisContent.includes("取引") ||
      shiftJisContent.includes("借方") ||
      shiftJisContent.includes("貸方") ||
      shiftJisContent.includes("寄付者")
    ) {
      return shiftJisContent;
    }
  } catch (_error) {
    // Shift-JIS decoding failed, continue to try other encodings
  }

  try {
    return buffer.toString("utf8");
  } catch (_error) {
    throw new Error("Unable to decode CSV file. Unsupported encoding.");
  }
}
