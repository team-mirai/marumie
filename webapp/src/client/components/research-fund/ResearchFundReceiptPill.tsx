import "client-only";

interface Props {
  /** 公開用の版が作成済みか。false の間は開けない「準備中」のピルにする */
  ready: boolean;
  onClick: () => void;
}

function ReceiptIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
      <path d="M9 8h6M9 12h6" />
    </svg>
  );
}

/**
 * 明細の「領収書」ピル。押すと領収書モーダルを開く（デザインの receiptStyle「ピル」案）。
 * 公開用の版がまだ無い書類は原本を配信しないので、押せない「準備中」のピルにする（#1803）。
 */
export default function ResearchFundReceiptPill({ ready, onClick }: Props) {
  if (!ready) {
    return (
      <span
        title="個人情報を黒塗りした公開用の領収書を準備しています"
        className="inline-flex h-[22px] shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-[#D1D5DB] bg-white px-2.5 text-xs leading-none font-bold text-[#9CA3AF]"
      >
        <ReceiptIcon />
        領収書準備中
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="領収書を見る"
      className="inline-flex h-[22px] shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap rounded-full border border-[#238778] bg-white px-2.5 text-xs leading-none font-bold text-[#238778] hover:bg-[#E2F6F3]"
    >
      <ReceiptIcon />
      領収書
    </button>
  );
}
