/**
 * 取得済みの Blob をブラウザのダウンロードとして保存する。
 * a[download] を一時的に生成してクリックする、という定型処理をまとめたもの。
 */
export function saveBlobAsFile(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => window.URL.revokeObjectURL(url), 100);
}
