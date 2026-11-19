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

/** 用途カードの「明細N件を見る」で選んだ用途。同じカードを続けて押しても一覧へ移動し直せるよう nonce を持つ。 */
interface RowsFilter {
  groupId: string;
  nonce: number;
}

interface CrossLinkValue {
  /** 枠で目立たせている用途カード（支出群のID） */
  flashedCardId: string | null;
  /** すべての出入金を絞り込んでいる用途。絞り込んでいなければ null */
  rowsFilter: RowsFilter | null;
  /** 明細の「用途NN」から、該当の用途カードへスクロールして一時的に目立たせる */
  showCard: (groupId: string) => void;
  /** 用途カードの「明細N件を見る」から、すべての出入金をその用途の明細だけに絞り込む */
  showRows: (groupId: string) => void;
  /** 用途での絞り込みを解除する */
  clearRowsFilter: () => void;
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
  const [rowsFilter, setRowsFilter] = useState<RowsFilter | null>(null);
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
    setRowsFilter((previous) => ({ groupId, nonce: (previous?.nonce ?? 0) + 1 }));
  }, []);

  const clearRowsFilter = useCallback(() => setRowsFilter(null), []);

  const value = useMemo(
    () => ({ flashedCardId, rowsFilter, showCard, showRows, clearRowsFilter }),
    [flashedCardId, rowsFilter, showCard, showRows, clearRowsFilter],
  );

  return <CrossLinkContext.Provider value={value}>{children}</CrossLinkContext.Provider>;
}

/** 用途の行。明細の「用途NN」から飛んできたときだけ背景を塗って目立たせる。 */
export function ResearchFundHighlightRow({
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
    <article
      id={`highlight-${groupId}`}
      data-flashed={flashed}
      className={`${className} transition-[background-color,box-shadow] duration-[400ms] ${
        flashed ? "bg-[#E2F6F3] shadow-[0_0_0_12px_#E2F6F3]" : ""
      }`}
    >
      {children}
    </article>
  );
}

/** 用途カードの「明細N件を見る」。押すとすべての出入金をその用途の明細だけに絞り込み、一覧へ飛ぶ。 */
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
