/**
 * CSV 文字列をレコード（欄の配列）の配列に分解する（RFC 4180 準拠）。
 *
 * - `"…"` で囲まれた欄の中のカンマ・改行は値の一部として扱う（改行はそのまま保つ）
 * - 囲まれた欄の中の `""` は `"` 1 文字として扱う
 * - レコードの区切りは LF と CRLF のどちらも受け付ける
 * - 空行は飛ばす
 */
export function parseCsv(content: string): string[][] {
  const chars = Array.from(content);
  const records: string[][] = [];
  let fields: string[] = [];
  let current = "";
  let inQuotes = false;

  const endRecord = () => {
    fields.push(current);
    if (!(fields.length === 1 && fields[0].trim() === "")) {
      records.push(fields);
    }
    fields = [];
    current = "";
  };

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    if (char === '"') {
      if (inQuotes && chars[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (inQuotes) {
      current += char;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else if (char === "\n") {
      endRecord();
    } else if (char === "\r" && chars[i + 1] === "\n") {
      // CRLF の CR は読み飛ばし、続く LF でレコードを閉じる
    } else {
      current += char;
    }
  }

  if (current !== "" || fields.length > 0) {
    endRecord();
  }

  return records;
}
