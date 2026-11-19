import {
  assignedPoliticianNames,
  togglePoliticianAssignment,
} from "@/client/lib/politician-assignment";

const politicians = [
  { id: "1", name: "山田太郎" },
  { id: "2", name: "佐藤花子" },
  { id: "3", name: "鈴木一郎" },
];

describe("assignedPoliticianNames", () => {
  it("担当する議員の名前を議員の並び順で返す", () => {
    expect(assignedPoliticianNames(["3", "1"], politicians)).toEqual(["山田太郎", "鈴木一郎"]);
  });

  it("担当がいなければ空配列を返す", () => {
    expect(assignedPoliticianNames([], politicians)).toEqual([]);
  });

  it("議員一覧に無い ID は表示しない", () => {
    expect(assignedPoliticianNames(["2", "99"], politicians)).toEqual(["佐藤花子"]);
  });
});

describe("togglePoliticianAssignment", () => {
  it("チェックした議員を並び順の位置に加える", () => {
    expect(togglePoliticianAssignment(["3"], "1", true, politicians)).toEqual(["1", "3"]);
  });

  it("チェックを外した議員を取り除く", () => {
    expect(togglePoliticianAssignment(["1", "2"], "1", false, politicians)).toEqual(["2"]);
  });

  it("既に担当している議員をチェックしても重複させない", () => {
    expect(togglePoliticianAssignment(["2"], "2", true, politicians)).toEqual(["2"]);
  });

  it("議員一覧に無い既存の担当 ID は解除せずに残す", () => {
    expect(togglePoliticianAssignment(["99", "3"], "1", true, politicians)).toEqual([
      "1",
      "3",
      "99",
    ]);
  });
});
