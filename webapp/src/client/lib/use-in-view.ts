import "client-only";

import { useEffect, useState } from "react";

/**
 * 要素が画面に入ったら true にする（一度 true になったら戻さない）。出現の動きの合図に使う。
 * ref はコールバック ref なので、最初は描かれず後から現れた要素も、現れた時点から監視する。
 */
export function useInView<T extends Element>() {
  const [el, setEl] = useState<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!el || inView) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [el, inView]);
  return { ref: setEl, inView };
}
