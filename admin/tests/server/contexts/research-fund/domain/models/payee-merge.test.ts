import { payeeMergeAddedAliases, payeeMergeRejection } from "@/server/contexts/research-fund/domain/models/payee-merge";

const target = { id: "7", politicianId: "5", invoiceRegistrationNumber: "T1234567890123" };

describe("payeeMergeRejection", () => {
  it("同じ議員の別の支払先で、インボイス登録番号が食い違わなければ統合できる", () => {
    expect(payeeMergeRejection(target, { id: "8", politicianId: "5", invoiceRegistrationNumber: "T1234567890123" })).toBeNull();
    expect(payeeMergeRejection(target, { id: "8", politicianId: "5", invoiceRegistrationNumber: null })).toBeNull();
    expect(payeeMergeRejection({ ...target, invoiceRegistrationNumber: null }, { id: "8", politicianId: "5", invoiceRegistrationNumber: "T9999999999999" })).toBeNull();
  });

  it("両方にインボイス登録番号があって食い違えば、両方の番号を示して統合しない", () => {
    expect(payeeMergeRejection(target, { id: "8", politicianId: "5", invoiceRegistrationNumber: "T9999999999999" })).toMatch(/インボイス登録番号が食い違うため統合できません（統合先: T1234567890123、統合元: T9999999999999）/);
  });

  it("別の議員の支払先・存在しない支払先は見つからないとして扱う", () => {
    expect(payeeMergeRejection(target, { id: "8", politicianId: "6", invoiceRegistrationNumber: null })).toBe("統合する支払先が見つかりません");
    expect(payeeMergeRejection(target, null)).toBe("統合する支払先が見つかりません");
  });

  it("同じ支払先どうしは統合しない", () => {
    expect(payeeMergeRejection(target, target)).toBe("同じ支払先どうしは統合できません");
  });
});

describe("payeeMergeAddedAliases", () => {
  const alias = (name: string, normalizedName: string) => ({ name, normalizedName });

  it("統合元の表記を記録の古い順に並べ、統合元の名称を最後に表記として加える", () => {
    expect(payeeMergeAddedAliases({ name: "東京ﾀｸｼｰ", aliases: [alias("TOKYO TAXI", "tokyotaxi"), alias("東京タクシー(株)", "東京タクシー株式会社")] }, [])).toEqual([
      alias("TOKYO TAXI", "tokyotaxi"),
      alias("東京タクシー(株)", "東京タクシー株式会社"),
      alias("東京ﾀｸｼｰ", "東京タクシー"),
    ]);
  });

  it("統合先にすでにある表記（正規化して同じもの）と、統合元の中で重なる表記は加えない", () => {
    expect(payeeMergeAddedAliases({ name: "TOKYO TAXI", aliases: [alias("Tokyo Taxi", "tokyotaxi"), alias("東京ﾀｸｼｰ", "東京タクシー")] }, [alias("東京タクシー", "東京タクシー")])).toEqual([alias("Tokyo Taxi", "tokyotaxi")]);
  });

  it("統合元の名称が表記として記録できなければ加えない", () => {
    expect(payeeMergeAddedAliases({ name: "あ".repeat(256), aliases: [] }, [])).toEqual([]);
  });
});
