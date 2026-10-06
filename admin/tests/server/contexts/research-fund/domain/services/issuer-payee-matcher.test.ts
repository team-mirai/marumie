import type { ReceiptIssuer } from "@/server/contexts/research-fund/domain/models/extracted-receipt";
import {
  matchPayeeByIssuer,
  normalizePayeeName,
} from "@/server/contexts/research-fund/domain/services/issuer-payee-matcher";

const issuer: ReceiptIssuer = { name: null, address: null, phone: null, invoice_registration_number: null };
const taxi = { id: "1", name: "東京タクシー株式会社", invoiceRegistrationNumber: "T1234567890123" };
const jr = { id: "2", name: "JR東日本", invoiceRegistrationNumber: null };
const payees = [taxi, jr];

describe("normalizePayeeName", () => {
  it.each([
    ["全角半角", "ＪＲ東日本", "JR東日本"],
    ["英字の大小", "jr東日本", "JR東日本"],
    ["空白", "東京 タクシー　株式会社", "東京タクシー株式会社"],
    ["法人格の略記（㈱）", "東京タクシー㈱", "東京タクシー株式会社"],
    ["法人格の略記（（株））", "東京タクシー（株）", "東京タクシー株式会社"],
    ["法人格の略記（(有)）", "(有)山田書店", "有限会社山田書店"],
  ])("%s の表記ゆれを吸収する", (_, a, b) => {
    expect(normalizePayeeName(a)).toBe(normalizePayeeName(b));
  });

  it("法人格の位置・有無は吸収しない", () => {
    expect(normalizePayeeName("株式会社東京タクシー")).not.toBe(normalizePayeeName("東京タクシー株式会社"));
    expect(normalizePayeeName("東京タクシー")).not.toBe(normalizePayeeName("東京タクシー株式会社"));
  });
});

describe("matchPayeeByIssuer", () => {
  it("インボイス登録番号が一致すれば、名称が違っても紐づける", () => {
    expect(matchPayeeByIssuer({ ...issuer, name: "東京タクシー 新宿営業所", invoice_registration_number: "Ｔ1234-5678-90123" }, payees)).toBe(taxi);
  });

  it("表記ゆれを吸収した名称が一致すれば紐づける", () => {
    expect(matchPayeeByIssuer({ ...issuer, name: "東京タクシー（株）" }, payees)).toBe(taxi);
    expect(matchPayeeByIssuer({ ...issuer, name: "ｊｒ東日本" }, payees)).toBe(jr);
  });

  it("名称が一致しなければ紐づけない", () => {
    expect(matchPayeeByIssuer({ ...issuer, name: "大阪タクシー株式会社" }, payees)).toBeNull();
  });

  it("部分一致では紐づけない", () => {
    expect(matchPayeeByIssuer({ ...issuer, name: "東京タクシー" }, payees)).toBeNull();
    expect(matchPayeeByIssuer({ ...issuer, name: "JR東日本 品川駅" }, payees)).toBeNull();
  });

  it("名称が一致する支払先が複数あれば紐づけない", () => {
    const branch = { id: "3", name: "ＪＲ東日本", invoiceRegistrationNumber: null };
    expect(matchPayeeByIssuer({ ...issuer, name: "JR東日本" }, [...payees, branch])).toBeNull();
  });

  it("インボイス登録番号が一致する支払先が複数あれば、名称が一致しても紐づけない", () => {
    const other = { id: "3", name: "東京タクシー 新宿", invoiceRegistrationNumber: "T1234567890123" };
    expect(matchPayeeByIssuer({ ...issuer, name: "東京タクシー株式会社", invoice_registration_number: "T1234567890123" }, [...payees, other])).toBeNull();
  });

  it("名称が一致してもインボイス登録番号が食い違えば紐づけない", () => {
    expect(matchPayeeByIssuer({ ...issuer, name: "東京タクシー株式会社", invoice_registration_number: "T9999999999999" }, payees)).toBeNull();
  });

  it("発行元にだけインボイス登録番号があれば、名称の一致で紐づける", () => {
    expect(matchPayeeByIssuer({ ...issuer, name: "JR東日本", invoice_registration_number: "T9999999999999" }, payees)).toBe(jr);
  });

  it("形の合わないインボイス登録番号は無いものとして名称で照合する", () => {
    expect(matchPayeeByIssuer({ ...issuer, name: "東京タクシー株式会社", invoice_registration_number: "T123" }, payees)).toBe(taxi);
  });

  it("発行元が無い・名称も番号も無ければ紐づけない", () => {
    expect(matchPayeeByIssuer(null, payees)).toBeNull();
    expect(matchPayeeByIssuer({ ...issuer, address: "東京都千代田区" }, payees)).toBeNull();
  });
});
