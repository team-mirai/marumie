import * as iconv from "iconv-lite";

export function bufferToString(buffer: Buffer): string {
  // Try to detect encoding and convert to UTF-8
  try {
    // First try Shift-JIS (common for Japanese CSV files)
    const shiftJisContent = iconv.decode(buffer, "shift_jis");

    // Check if the decoded content looks reasonable (contains expected Japanese characters)
    if (
      shiftJisContent.includes("取引") ||
      shiftJisContent.includes("借方") ||
      shiftJisContent.includes("貸方")
    ) {
      return shiftJisContent;
    }
  } catch (_error) {
    // Shift-JIS decoding failed, continue to try other encodings
  }

  try {
    // Try UTF-8
    return buffer.toString("utf8");
  } catch (_error) {
    throw new Error("Unable to decode CSV file. Unsupported encoding.");
  }
}
