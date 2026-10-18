/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { NumberInputWheelGuard } from "@/client/components/layout/NumberInputWheelGuard";

describe("NumberInputWheelGuard", () => {
  it("フォーカス中の数値の入力欄でホイールを回すと、フォーカスが外れる", () => {
    render(
      <>
        <NumberInputWheelGuard />
        <input type="number" aria-label="金額" />
      </>,
    );
    const input = screen.getByLabelText("金額");
    input.focus();

    fireEvent.wheel(input);

    expect(document.activeElement).not.toBe(input);
  });

  it("フォーカスの無い数値の入力欄や、数値以外の入力欄には何もしない", () => {
    render(
      <>
        <NumberInputWheelGuard />
        <input type="number" aria-label="金額" />
        <input type="text" aria-label="摘要" />
      </>,
    );
    const text = screen.getByLabelText("摘要");
    text.focus();

    fireEvent.wheel(screen.getByLabelText("金額"));
    fireEvent.wheel(text);

    expect(document.activeElement).toBe(text);
  });

  it("アンマウント後はリスナーが外れる", () => {
    const { unmount } = render(<NumberInputWheelGuard />);
    unmount();
    render(<input type="number" aria-label="金額" />);
    const input = screen.getByLabelText("金額");
    input.focus();

    fireEvent.wheel(input);

    expect(document.activeElement).toBe(input);
  });
});
