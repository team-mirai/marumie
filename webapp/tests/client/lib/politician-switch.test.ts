import {
  parseSwitchMemo,
  rubberBand,
  serializeSwitchMemo,
  swipeCardStyle,
  swipeDirection,
  swipeIsHorizontal,
} from "@/client/lib/politician-switch";

describe("swipeIsHorizontal", () => {
  it("動きが 8px 以内のうちは決めない", () => {
    expect(swipeIsHorizontal(8, -8)).toBeNull();
  });

  it("横の動きが縦の 1.2 倍を超えれば横", () => {
    expect(swipeIsHorizontal(-13, 10)).toBe(true);
  });

  it("縦スクロールしようとした動きは横にしない", () => {
    expect(swipeIsHorizontal(10, 30)).toBe(false);
    expect(swipeIsHorizontal(12, 10)).toBe(false);
  });
});

describe("rubberBand / swipeCardStyle", () => {
  it("動かすほど重くなる", () => {
    expect(rubberBand(260)).toBe(130);
    expect(rubberBand(-260)).toBe(-130);
    expect(rubberBand(0)).toBe(0);
  });

  it("少し傾いて薄くなり、薄さは 0.75 で止まる", () => {
    expect(swipeCardStyle(-65)).toEqual({
      transform: `translate3d(-52px,0,0) rotate(${-52 / 60}deg)`,
      opacity: String(1 - 52 / 400),
    });
    expect(swipeCardStyle(-100000).opacity).toBe("0.75");
  });
});

describe("swipeDirection", () => {
  it("48px 以上左へ払えば次、右へ払えば前", () => {
    expect(swipeDirection(-48)).toBe(1);
    expect(swipeDirection(60)).toBe(-1);
  });

  it("足りなければ切り替えない", () => {
    expect(swipeDirection(47)).toBeNull();
    expect(swipeDirection(-47)).toBeNull();
  });
});

describe("parseSwitchMemo", () => {
  const raw = serializeSwitchMemo({ from: "taro", to: "hanako", direction: 1 });

  it("表示中の議員宛てのメモを読む", () => {
    expect(parseSwitchMemo(raw, "hanako")).toEqual({ from: "taro", to: "hanako", direction: 1 });
  });

  it("ほかの議員宛てのメモ・メモが無いときは使わない", () => {
    expect(parseSwitchMemo(raw, "jiro")).toBeNull();
    expect(parseSwitchMemo(null, "hanako")).toBeNull();
  });

  it("壊れたメモは無視する", () => {
    expect(parseSwitchMemo("{", "hanako")).toBeNull();
    expect(parseSwitchMemo('{"from":"taro","to":"hanako","direction":2}', "hanako")).toBeNull();
  });
});
