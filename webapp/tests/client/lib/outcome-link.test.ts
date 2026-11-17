import { outcomeLinkOf } from "@/client/lib/outcome-link";

describe("outcomeLinkOf", () => {
  it("YouTube のリンクは、ラベルの「(Youtube)」を取り除いてアイコンで出す", () => {
    expect(outcomeLinkOf("参加報告(Youtube)", "https://www.youtube.com/live/abc")).toEqual({
      sns: "YouTube",
      text: "参加報告",
      ariaLabel: "参加報告（YouTube、別タブで開きます）",
    });
  });

  it("X のリンクは、全角の括弧の「（X）」も取り除く", () => {
    expect(outcomeLinkOf("開催報告（X）", "https://x.com/someone/status/1")).toEqual({
      sns: "X",
      text: "開催報告",
      ariaLabel: "開催報告（X、別タブで開きます）",
    });
  });

  it("先頭の「Youtube」も取り除く", () => {
    expect(outcomeLinkOf("Youtube動画", "https://youtu.be/abc").text).toBe("動画");
  });

  it("取り除くと空になるときはラベルをそのまま出す", () => {
    expect(outcomeLinkOf("YouTube", "https://youtu.be/abc").text).toBe("YouTube");
  });

  it("YouTube・X 以外のリンクは文字のまま出す", () => {
    expect(outcomeLinkOf("受付窓口を見る(X)", "https://example.com/madoguchi")).toEqual({
      sns: null,
      text: "受付窓口を見る(X)",
      ariaLabel: "受付窓口を見る(X)（外部サイト、別タブで開きます）",
    });
  });
});
