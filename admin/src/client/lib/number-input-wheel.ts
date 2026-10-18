/**
 * フォーカス中の数値の入力欄の上でマウスホイールを回すと、ブラウザによっては値が増減してしまう。
 * その入力欄からフォーカスを外して増減を止める（ページのスクロールはそのまま効く）。
 */
export function blurFocusedNumberInputOnWheel(event: Pick<WheelEvent, "target">): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  if (target.type !== "number") return;
  if (target.ownerDocument.activeElement !== target) return;
  target.blur();
}
