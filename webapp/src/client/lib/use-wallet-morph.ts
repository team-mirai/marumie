import "client-only";

import { type RefObject, useCallback, useEffect, useRef } from "react";
import { anchoredSheetMarginTop, collapsedSheetMarginBottom } from "@/client/lib/wallet-deck";

const DURATION = 560;
const EASING = "cubic-bezier(.22,1,.36,1)";
const CARD_PROPS = ["height", "margin-top", "padding-top", "padding-bottom"];
const SHEET_PROPS = ["height", "margin-top", "margin-bottom"];
const USER_SCROLL_EVENTS = ["touchstart", "touchmove", "wheel", "keydown"] as const;

type Geometry = Record<string, string>;

interface Pending {
  slug: string;
  opening: boolean;
  reduce: boolean;
  /** 押したカードの、切り替え前の画面上の位置 */
  anchorTop: number | null;
  cards: Map<string, Geometry>;
  onClosed: () => void;
}

function cardGeometry(el: HTMLElement): Geometry {
  const style = getComputedStyle(el);
  return {
    // 押したときの縮み（transform）を含まない高さ
    height: `${el.offsetHeight}px`,
    "margin-top": style.marginTop,
    "padding-top": style.paddingTop,
    "padding-bottom": style.paddingBottom,
  };
}

function px(value: number): string {
  return `${value}px`;
}

/**
 * SP のウォレット（縦に重ねた議員カード）の開閉アニメーション（v9 の hqWalletMorph）。
 * 切り替える前に各カードの高さ・余白を測り、切り替えたあとに「前の値 → 新しい値」をトランジションでつなぐ。
 * 開くシートは最小の高さから広げ、閉じるシートは描いたまま最小の高さまで縮めて消し、終わったら onClosed で外してもらう。
 * そのあいだ押したカードが指の下から動かないよう、スクロールで打ち消す（ユーザーがスクロールし始めたらやめる）。
 *
 * カードには data-wallet-card、シートには data-wallet-sheet に議員の slug を入れておく。
 * 使い方：状態を切り替える直前に prepare を呼び、切り替えた描画の useLayoutEffect で run を呼ぶ。
 */
export function useWalletMorph(listRef: RefObject<HTMLElement | null>) {
  const pending = useRef<Pending | null>(null);
  const cleanups = useRef<(() => void)[]>([]);

  const cancel = useCallback(() => {
    const running = cleanups.current;
    cleanups.current = [];
    for (const cleanup of running) cleanup();
  }, []);

  useEffect(() => cancel, [cancel]);

  /** 切り替える直前に呼ぶ。動いている途中のアニメーションは終わった状態にしてから測る。アニメーションするなら true */
  const prepare = useCallback(
    (slug: string, opening: boolean, onClosed: () => void): boolean => {
      cancel();
      const root = listRef.current;
      if (!root) return false;
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
      const cards = new Map<string, Geometry>();
      for (const card of root.querySelectorAll<HTMLElement>("[data-wallet-card]")) {
        cards.set(card.dataset.walletCard ?? "", cardGeometry(card));
      }
      const anchor = root.querySelector<HTMLElement>(`[data-wallet-card="${slug}"]`);
      pending.current = {
        slug,
        opening,
        reduce,
        anchorTop: anchor ? anchor.getBoundingClientRect().top : null,
        cards,
        onClosed,
      };
      return !reduce;
    },
    [cancel, listRef],
  );

  /** 切り替えたあとの描画（useLayoutEffect）で呼ぶ */
  const run = useCallback(() => {
    const p = pending.current;
    pending.current = null;
    const root = listRef.current;
    if (!p || !root) return;
    const list = cleanups.current;

    // ユーザーが指やホイールでスクロールしはじめたら、カードを指の下に留める補正はやめる（補正とぶつかってガタつくため）
    let userMoved = false;
    const onUser = () => {
      userMoved = true;
    };
    for (const type of USER_SCROLL_EVENTS) {
      window.addEventListener(type, onUser, { passive: true, capture: true });
    }
    const unlisten = () => {
      for (const type of USER_SCROLL_EVENTS) {
        window.removeEventListener(type, onUser, { capture: true });
      }
    };
    const anchor = root.querySelector<HTMLElement>(`[data-wallet-card="${p.slug}"]`);
    const keep = () => {
      if (userMoved || !anchor || p.anchorTop === null) return;
      const diff = anchor.getBoundingClientRect().top - p.anchorTop;
      if (Math.abs(diff) > 0.5) window.scrollBy(0, diff);
    };

    if (p.reduce) {
      keep();
      requestAnimationFrame(() => {
        keep();
        unlisten();
      });
      return;
    }

    // 前の値 → 新しい値をトランジションでつなぐ
    const morph = (
      el: HTMLElement,
      props: string[],
      from: Geometry,
      to: Geometry,
      fade?: "in" | "out",
    ) => {
      const set = (prop: string, value: string) => el.style.setProperty(prop, value, "important");
      set("transition", "none");
      for (const prop of props) set(prop, from[prop]);
      if (fade) set("opacity", fade === "in" ? "0" : "1");
      el.getBoundingClientRect();
      const transitions = props.map((prop) => `${prop} ${DURATION}ms ${EASING}`);
      if (fade) {
        transitions.push(
          `opacity ${Math.round(DURATION * (fade === "in" ? 0.9 : 0.55))}ms ${EASING}`,
        );
      }
      set("transition", transitions.join(","));
      for (const prop of props) set(prop, to[prop]);
      if (fade) set("opacity", fade === "in" ? "1" : "0");
      const done = () => {
        for (const prop of [...props, "transition", "opacity", "overflow"]) {
          el.style.removeProperty(prop);
        }
      };
      const timer = setTimeout(done, DURATION + 40);
      list.push(() => {
        clearTimeout(timer);
        done();
      });
    };

    // カード：高さと余白が変わったものだけ。先に全部の切り替え後の値を測ってから動かす
    const cards = [...root.querySelectorAll<HTMLElement>("[data-wallet-card]")].map((card) => ({
      card,
      slug: card.dataset.walletCard ?? "",
      after: cardGeometry(card),
    }));
    for (const { card, slug, after } of cards) {
      const before = p.cards.get(slug);
      if (before && CARD_PROPS.some((prop) => before[prop] !== after[prop])) {
        morph(card, CARD_PROPS, before, after);
      }
    }

    const cardBefore = Number.parseFloat(p.cards.get(p.slug)?.height ?? "0");
    // カードは動かしはじめている（前の高さにしてある）ので、動かす前に測った切り替え後の高さを使う
    const tapped = cards.find((item) => item.slug === p.slug);
    const cardAfter = tapped ? Number.parseFloat(tapped.after.height) : cardBefore;
    const sheet = root.querySelector<HTMLElement>(`[data-wallet-sheet="${p.slug}"]`);
    if (sheet) {
      const style = getComputedStyle(sheet);
      const minHeight =
        Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom);
      const marginTop = Number.parseFloat(style.marginTop);
      const full = {
        height: px(sheet.offsetHeight),
        "margin-top": style.marginTop,
        "margin-bottom": style.marginBottom,
      };
      sheet.style.setProperty("overflow", "hidden", "important");
      if (p.opening) {
        // 開いたシート：最小の高さから広げる。広げはじめは場所を取らず、上端は開いたあとの位置に留める
        const startTop = anchoredSheetMarginTop(marginTop, cardAfter, cardBefore);
        morph(
          sheet,
          SHEET_PROPS,
          {
            height: px(minHeight),
            "margin-top": px(startTop),
            "margin-bottom": px(collapsedSheetMarginBottom(startTop, minHeight)),
          },
          full,
          "in",
        );
      } else {
        // 閉じたシート：もとの位置のまま、最小の高さまで縮めながら消す
        const endTop = anchoredSheetMarginTop(marginTop, cardBefore, cardAfter);
        morph(
          sheet,
          SHEET_PROPS,
          full,
          {
            height: px(minHeight),
            "margin-top": px(endTop),
            "margin-bottom": px(collapsedSheetMarginBottom(endTop, minHeight)),
          },
          "out",
        );
      }
    }
    if (!p.opening) {
      // 縮み終わった直後に外す（後片付けで指定を外すより前。外す直前に元の高さへ戻ってちらつかないように）
      const timer = setTimeout(p.onClosed, DURATION + 16);
      list.push(() => {
        clearTimeout(timer);
        p.onClosed();
      });
    }

    // 押したカードを指の下に留める。閉じるときは上のカードが動かないので、閉じ終わったあとに一度だけ位置を合わせる
    // （毎フレームの補正は閉じる動きと描画のタイミングがずれてガタつくため）
    if (!p.opening) {
      const timer = setTimeout(() => {
        keep();
        unlisten();
      }, DURATION + 60);
      list.push(() => {
        clearTimeout(timer);
        unlisten();
      });
      return;
    }
    let stopped = false;
    const end = performance.now() + DURATION + 80;
    const loop = () => {
      if (stopped) return;
      keep();
      if (performance.now() < end && !userMoved) requestAnimationFrame(loop);
      else unlisten();
    };
    requestAnimationFrame(loop);
    keep();
    list.push(() => {
      stopped = true;
      unlisten();
    });
  }, [listRef]);

  return { prepare, run };
}
