import { payeeAliasFromIssuer, payeeAliasFromName } from "@/server/contexts/research-fund/domain/models/payee-alias";

const issuer = { name: null, address: null, phone: null, invoice_registration_number: null };

describe("payeeAliasFromIssuer", () => {
  it("発行元の名称を印字されたまま（前後の空白だけ落として）と、照合用に正規化したものにする", () => {
    expect(payeeAliasFromIssuer({ ...issuer, name: "  東京タクシー（株） " })).toEqual({ name: "東京タクシー（株）", normalizedName: "東京タクシー株式会社" });
  });

  it("発行元が無い・名称が読み取れていなければ記録しない", () => {
    expect(payeeAliasFromIssuer(null)).toBeNull();
    expect(payeeAliasFromIssuer({ ...issuer, address: "東京都千代田区" })).toBeNull();
    expect(payeeAliasFromIssuer({ ...issuer, name: "   " })).toBeNull();
  });

  it("保存できない長さの名称は切り詰めずに記録しない", () => {
    expect(payeeAliasFromIssuer({ ...issuer, name: "あ".repeat(256) })).toBeNull();
    expect(payeeAliasFromIssuer({ ...issuer, name: "あ".repeat(255) })).not.toBeNull();
  });
});

describe("payeeAliasFromName", () => {
  it("名称を前後の空白だけ落として、照合用に正規化したものを添える。空なら記録しない", () => {
    expect(payeeAliasFromName(" ㈱東京タクシー ")).toEqual({ name: "㈱東京タクシー", normalizedName: "株式会社東京タクシー" });
    expect(payeeAliasFromName("  ")).toBeNull();
  });
});
