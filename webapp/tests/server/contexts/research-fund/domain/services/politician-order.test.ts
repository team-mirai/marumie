import { sortPoliticiansByKana } from "@/server/contexts/research-fund/domain/services/politician-order";

const politician = (name: string, nameKana: string | null) => ({ name, nameKana });

describe("sortPoliticiansByKana", () => {
  it("ふりがなの五十音順に並べる", () => {
    const sorted = sortPoliticiansByKana([
      politician("山田", "やまだ"),
      politician("峰島", "みねしま"),
      politician("安野", "あんの"),
      politician("武藤", "むとう"),
      politician("宇佐美", "うさみ"),
    ]);

    expect(sorted.map((p) => p.name)).toEqual(["安野", "宇佐美", "峰島", "武藤", "山田"]);
  });

  it("ひらがなとカタカナ、濁点の有無が混ざっていても五十音順に並べる", () => {
    const sorted = sortPoliticiansByKana([
      politician("須田", "すだ"),
      politician("小林", "コバヤシ"),
      politician("河合", "かわい"),
      politician("高山", "たかやま"),
    ]);

    expect(sorted.map((p) => p.name)).toEqual(["河合", "小林", "須田", "高山"]);
  });

  it("ふりがなが未登録・空の議員は後ろに回し、その中では名前で並べる", () => {
    const sorted = sortPoliticiansByKana([
      politician("B", null),
      politician("林", "はやし"),
      politician("A", "  "),
      politician("安野", "あんの"),
    ]);

    expect(sorted.map((p) => p.name)).toEqual(["安野", "林", "A", "B"]);
  });

  it("元の配列は変えない", () => {
    const original = [politician("山田", "やまだ"), politician("安野", "あんの")];

    sortPoliticiansByKana(original);

    expect(original.map((p) => p.name)).toEqual(["山田", "安野"]);
  });
});
