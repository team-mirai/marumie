"use client";
import "client-only";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/** 用途カードを枠で目立たせておく時間 */
const CARD_FLASH_MS = 1800;
/** 固定ヘッダーに隠れないよう、用途カードへ飛ぶときに上を空ける量 */
const CARD_SCROLL_OFFSET = 120;

/** 用途カードの「N件」が押されたことを明細一覧に伝える。同じカードを続けて押しても届くよう nonce を持つ。 */
interface RowsRequest {
  groupId: string;
  nonce: number;
}

interface CrossLinkValue {
  /** 枠で目立たせている用途カード（支出群のID） */
  flashedCardId: string | null;
  rowsRequest: RowsRequest | null;
  /** 明細の「★ 用途N」から、該当の用途カードへスクロールして一時的に目立たせる */
  showCard: (groupId: string) => void;
  /** 用途カードの「N件」から、明細一覧に該当行の表示を頼む */
  showRows: (groupId: string) => void;
}

const CrossLinkContext = createContext<CrossLinkValue | null>(null);

export function useResearchFundCrossLink(): CrossLinkValue {
  const value = useContext(CrossLinkContext);
  if (!value) throw new Error("ResearchFundCrossLinkProvider の外では使えません");
  return value;
}

/**
 * 調研費ページの「活用方針と主な用途」と「すべての出入金」を相互にジャンプさせる。
 * 2つのセクションは離れて置かれるので、状態をここに持たせて両方から参照する。
 */
export function ResearchFundCrossLinkProvider({ children }: { children: React.ReactNode }) {
  const [flashedCardId, setFlashedCardId] = useState<string | null>(null);
  const [rowsRequest, setRowsRequest] = useState<RowsRequest | null>(null);
  const cardTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (cardTimer.current) clearTimeout(cardTimer.current);
    },
    [],
  );

  const showCard = useCallback((groupId: string) => {
    const card = document.getElementById(`highlight-${groupId}`);
    if (!card) return;
    window.scrollTo({
      top: card.getBoundingClientRect().top + window.scrollY - CARD_SCROLL_OFFSET,
      behavior: "smooth",
    });
    setFlashedCardId(groupId);
    if (cardTimer.current) clearTimeout(cardTimer.current);
    cardTimer.current = setTimeout(() => setFlashedCardId(null), CARD_FLASH_MS);
  }, []);

  const showRows = useCallback((groupId: string) => {
    setRowsRequest((previous) => ({ groupId, nonce: (previous?.nonce ?? 0) + 1 }));
  }, []);

  const value = useMemo(
    () => ({ flashedCardId, rowsRequest, showCard, showRows }),
    [flashedCardId, rowsRequest, showCard, showRows],
  );

  return <CrossLinkContext.Provider value={value}>{children}</CrossLinkContext.Provider>;
}

/** 用途カードの外枠。明細の「★ 用途N」から飛んできたときだけ枠を強調する。 */
export function ResearchFundHighlightCard({
  groupId,
  className,
  children,
}: {
  groupId: string;
  className: string;
  children: React.ReactNode;
}) {
  const { flashedCardId } = useResearchFundCrossLink();
  const flashed = flashedCardId === groupId;
  return (
    <div
      id={`highlight-${groupId}`}
      className={`${className} transition-[border-color,box-shadow] duration-300 ${
        flashed ? "border-[#2AA693] shadow-[0_0_0_4px_#E2F6F3]" : "border-[#E5E7EB]"
      }`}
    >
      {children}
    </div>
  );
}

/** 用途カードの「N件」。押すと明細一覧の該当行へ飛ぶ。 */
export function ResearchFundGroupRowsLink({
  groupId,
  className,
  children,
}: {
  groupId: string;
  className: string;
  children: React.ReactNode;
}) {
  const { showRows } = useResearchFundCrossLink();
  return (
    <button
      type="button"
      onClick={() => showRows(groupId)}
      className={`cursor-pointer ${className}`}
    >
      {children}
    </button>
  );
}
