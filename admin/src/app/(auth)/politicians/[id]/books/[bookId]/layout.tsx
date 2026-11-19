import "server-only";

/**
 * 配下の画面から呼ぶサーバーアクション（書類の読み取りなど）は LLM を呼ぶことがあり、途中で打ち切られないよう
 * 関数の実行時間の上限を延ばす。公開用の版の作成はキューから呼ばれるサーバー側の処理に移した（#1812）
 */
export const maxDuration = 300;

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return children;
}
