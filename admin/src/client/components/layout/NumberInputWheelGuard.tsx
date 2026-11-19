"use client";

import { useEffect } from "react";
import { blurFocusedNumberInputOnWheel } from "@/client/lib/number-input-wheel";

/**
 * admin 全体の数値の入力欄で、マウスホイールによる値の増減を止める。
 * document に 1 つだけリスナーを置くので、個々の入力欄で対応しなくても効く。
 */
export function NumberInputWheelGuard() {
  useEffect(() => {
    document.addEventListener("wheel", blurFocusedNumberInputOnWheel, {
      capture: true,
      passive: true,
    });
    return () => {
      document.removeEventListener("wheel", blurFocusedNumberInputOnWheel, { capture: true });
    };
  }, []);
  return null;
}
