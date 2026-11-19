import { PoliticianAssignmentModel } from "@/server/contexts/auth/domain/models/politician-assignment";

describe("PoliticianAssignmentModel.normalize", () => {
  it("重複を除き、議員の ID の昇順に並べる", () => {
    expect(PoliticianAssignmentModel.normalize(["10", "2", "10", "1"])).toEqual(["1", "2", "10"]);
  });

  it("空の指定（担当をすべて外す）を受け付ける", () => {
    expect(PoliticianAssignmentModel.normalize([])).toEqual([]);
  });

  it.each(["0", "-1", "abc", "1.5", "", "01", "12345678901234567890"])(
    "議員の ID として不正な値 %p を拒否する",
    (id) => {
      expect(() => PoliticianAssignmentModel.normalize(["1", id])).toThrow("議員の ID が不正です");
    },
  );
});
