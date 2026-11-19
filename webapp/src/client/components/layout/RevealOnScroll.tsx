"use client";
import "client-only";

import { useEffect } from "react";

/**
 * カード（`data-reveal` を付けた要素）を、画面に入るときに控えめにフェードインさせる。
 * `data-reveal="mask"` を付けた見出しは、行（RevealHeadingText）ごとに下からせり上がらせる。
 * 描画しない部品で、ページに 1 つ置く。
 * 表示した時点で画面に入っているカードと、「動きを減らす」設定のときは動かさない（最初から見せる）。
 * JS が動かないときも隠れたままにならないよう、隠すのは JS で印を付けた要素だけにする。
 */
export default function RevealOnScroll() {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]")).filter(
      (el) => el.getBoundingClientRect().top >= window.innerHeight,
    );
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 },
    );
    for (const el of targets) {
      el.classList.add(armedClassOf(el));
      observer.observe(el);
    }
    return () => {
      observer.disconnect();
      for (const el of targets) el.classList.remove(armedClassOf(el), "is-in");
    };
  }, []);

  return null;
}

function armedClassOf(el: HTMLElement): string {
  return el.dataset.reveal === "mask" ? "reveal-mask-armed" : "reveal-armed";
}
