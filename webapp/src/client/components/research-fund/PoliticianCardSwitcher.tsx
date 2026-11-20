"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, type TouchEvent, useLayoutEffect, useRef, useState } from "react";
import {
  parseSwitchMemo,
  SWITCH_MEMO_KEY,
  type SwitchDirection,
  serializeSwitchMemo,
  swipeCardStyle,
  swipeDirection,
  swipeIsHorizontal,
} from "@/client/lib/politician-switch";

/** 前後の切り替え先 */
interface SwitchTarget {
  slug: string;
  name: string;
  href: string;
}

interface PoliticianSwitchNav {
  prev: SwitchTarget;
  next: SwitchTarget;
  /** 位置の点。公開中の議員の表示順 */
  dots: { slug: string }[];
}

interface Props {
  currentSlug: string;
  /** 前後の議員への切り替え。null ならカードを並べるだけ */
  nav: PoliticianSwitchNav | null;
  pcCard: ReactNode;
  spCard: ReactNode;
  /** SP の点の右に添える「10 / 12」 */
  position: ReactNode;
}

const SP_QUERY = "(max-width: 640px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function Chevron({ direction }: { direction: "prev" | "next" }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={direction === "prev" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}

// v9 の .mm-nav。カードの左右の縁を中心に置く（SP 48px・PC 40px）。SP は下の位置表示（点と「10 / 12」）を除いたカードの上下中央に置く。押したとき・ホバーの動きは globals.css の .politician-switch-nav
const NAV_BUTTON_CLASS =
  "politician-switch-nav absolute top-[calc(50%-30px)] z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/90 bg-white/60 text-[#0B0F0E] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_12px_26px_-12px_rgba(10,60,52,0.5),0_2px_6px_rgba(10,60,52,0.1)] backdrop-blur-[14px] hover:bg-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F8472] min-[641px]:top-1/2 min-[641px]:h-10 min-[641px]:w-10 min-[641px]:border-0 min-[641px]:bg-white min-[641px]:shadow-[0_2px_6px_rgba(11,15,14,0.10),0_8px_20px_rgba(11,15,14,0.10)] min-[641px]:backdrop-blur-none min-[641px]:hover:bg-[#E2F6F3] min-[641px]:hover:text-[#0F8472]";

/**
 * 議員ページ冒頭の議員カードの、前後の議員への切り替え（デザイン v9 の mmGo / swS / swM / swE）。
 * 左右のボタンで切り替え、SP はカードを横にスワイプしても切り替える（指について動き、48px 以上で切り替え、足りなければ弾んで戻る）。
 * 切り替えた向きを sessionStorage に残し、遷移先のページの SP のカードはその向きから入ってくる。URL から直接開いたときは動かさない。
 */
export default function PoliticianCardSwitcher({
  currentSlug,
  nav,
  pcCard,
  spCard,
  position,
}: Props) {
  const router = useRouter();
  const spCardRef = useRef<HTMLDivElement>(null);
  const swipeRef = useRef<{ x: number; y: number; horizontal: boolean | null } | null>(null);
  // 入ってくる向き（null なら動かさない）と、伸ばす点。切り替えてきたときは切り替え前の点から伸ばし直す
  const [enterDirection, setEnterDirection] = useState<SwitchDirection | null>(null);
  const [activeDot, setActiveDot] = useState(currentSlug);

  // 描画前にメモを読む（入ってくる前のカードや、切り替え前の点が一瞬見えないように）
  useLayoutEffect(() => {
    let memo = null;
    try {
      memo = parseSwitchMemo(sessionStorage.getItem(SWITCH_MEMO_KEY), currentSlug);
      sessionStorage.removeItem(SWITCH_MEMO_KEY);
    } catch {
      // sessionStorage が使えないときは動かさない
    }
    if (!memo) return;
    setEnterDirection(memo.direction);
    setActiveDot(memo.from);
    // 切り替え前の点を一度描いてから、表示中の点へ伸ばす
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setActiveDot(currentSlug));
    });
    return () => cancelAnimationFrame(frame);
  }, [currentSlug]);

  const remember = (target: SwitchTarget, direction: SwitchDirection) => {
    try {
      sessionStorage.setItem(
        SWITCH_MEMO_KEY,
        serializeSwitchMemo({ from: currentSlug, to: target.slug, direction }),
      );
    } catch {
      // 残せなくても切り替え自体はできる
    }
  };

  const setCardStyle = (style: { transform: string; opacity: string; transition: string }) => {
    const card = spCardRef.current;
    if (!card) return;
    card.style.transform = style.transform;
    card.style.opacity = style.opacity;
    card.style.transition = style.transition;
  };

  const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
    const touch = event.touches[0];
    if (!nav || !touch || !window.matchMedia(SP_QUERY).matches) return;
    if (event.target instanceof Element && event.target.closest("a, button")) return;
    swipeRef.current = { x: touch.clientX, y: touch.clientY, horizontal: null };
    setEnterDirection(null);
    setCardStyle({ transform: "", opacity: "", transition: "none" });
  };

  const handleTouchMove = (event: TouchEvent<HTMLElement>) => {
    const swipe = swipeRef.current;
    const touch = event.touches[0];
    if (!swipe || !touch) return;
    const dx = touch.clientX - swipe.x;
    if (swipe.horizontal === null)
      swipe.horizontal = swipeIsHorizontal(dx, touch.clientY - swipe.y);
    if (!swipe.horizontal || window.matchMedia(REDUCED_MOTION_QUERY).matches) return;
    setCardStyle({ ...swipeCardStyle(dx), transition: "none" });
  };

  const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
    const swipe = swipeRef.current;
    swipeRef.current = null;
    if (!swipe || !nav) return;
    const touch = event.changedTouches[0];
    const direction = touch && swipe.horizontal ? swipeDirection(touch.clientX - swipe.x) : null;
    if (direction === null) {
      // 元の位置へ弾むように戻る
      setCardStyle({
        transform: "",
        opacity: "",
        transition: "transform .45s cubic-bezier(.2,.9,.25,1.15), opacity .3s",
      });
      return;
    }
    setCardStyle({ transform: "", opacity: "", transition: "" });
    const target = direction === 1 ? nav.next : nav.prev;
    remember(target, direction);
    router.push(target.href);
  };

  const enterClass =
    enterDirection === 1
      ? "politician-switch-in-r"
      : enterDirection === -1
        ? "politician-switch-in-l"
        : "";

  // 左右のボタンが画面の端で切れないよう、カードを内側に寄せる（v9：SP 16px、641〜900px 20px、901〜1200px 12px）。
  // v9 は PC でその外側に .mt-wrap の余白 clamp(12px,3vw,32px) があるが、MainColumn は 1032px 未満で左右の余白が 0 なので、その分を足す。
  // 1032px 以上は MainColumn の外側の余白（(100vw − 1032px) / 2）が増える分だけ差し引く（最小は v9 の 12px）
  return (
    <section
      aria-label="議員情報"
      className="relative mx-4 max-[640px]:touch-pan-y min-[641px]:mx-[calc(3vw_+_20px)] min-[901px]:mx-[max(12px,calc(min(3vw,32px)_+_12px_-_max(0px,(100vw_-_1032px)_/_2)))] min-[1201px]:mx-0"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {pcCard}
      <div ref={spCardRef} className={`min-[641px]:hidden ${enterClass}`}>
        {spCard}
      </div>

      {nav && (
        <>
          <Link
            href={nav.prev.href}
            onClick={() => remember(nav.prev, -1)}
            aria-label={`前の議員（${nav.prev.name}）の調研費へ`}
            title={`前の議員（${nav.prev.name}）の調研費へ`}
            className={`${NAV_BUTTON_CLASS} is-prev -left-6 min-[641px]:-left-5`}
          >
            <Chevron direction="prev" />
          </Link>
          <Link
            href={nav.next.href}
            onClick={() => remember(nav.next, 1)}
            aria-label={`次の議員（${nav.next.name}）の調研費へ`}
            title={`次の議員（${nav.next.name}）の調研費へ`}
            className={`${NAV_BUTTON_CLASS} is-next -right-6 min-[641px]:-right-5`}
          >
            <Chevron direction="next" />
          </Link>

          {/* SP：何人目かの表示。点は飾りにして、位置は文字で伝える */}
          <div className="mt-3.5 flex h-6 items-center justify-center min-[641px]:hidden">
            <div aria-hidden="true" className="flex items-center gap-0.5">
              {nav.dots.map((dot) => {
                const on = dot.slug === activeDot;
                return (
                  <span
                    key={dot.slug}
                    className={`flex h-6 items-center justify-center ${on ? "w-[30px]" : "w-5"}`}
                  >
                    <span
                      className={`politician-switch-dot block h-1.5 rounded-full ${
                        on ? "w-[22px] bg-[#0F8472]" : "w-1.5 bg-[#0F8472]/25"
                      }`}
                    />
                  </span>
                );
              })}
            </div>
            {position}
          </div>
        </>
      )}
    </section>
  );
}
