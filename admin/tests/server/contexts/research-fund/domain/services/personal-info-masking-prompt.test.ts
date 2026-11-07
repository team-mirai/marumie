import { buildPersonalInfoMaskingPrompt } from "@/server/contexts/research-fund/domain/services/personal-info-masking-prompt";

function section(prompt: string, title: string): string {
  const start = prompt.indexOf(`■ ${title}`);
  const next = prompt.indexOf("■ ", start + 1);
  return prompt.slice(start, next === -1 ? undefined : next);
}

describe("buildPersonalInfoMaskingPrompt", () => {
  it("画像の大きさと、塗る対象・塗らない対象を含む", () => {
    const prompt = buildPersonalInfoMaskingPrompt(800, 1200);

    expect(prompt).toContain("幅 800 画素 × 高さ 1200 画素");
    expect(prompt).toContain("議員本人の電話番号");
    expect(prompt).toContain("店舗・事業者・発行元");
  });

  it("宛先が議員会館の住所を、郵便番号・所在地・会館名・部屋番号まで塗らない対象に含む", () => {
    const notMasked = section(buildPersonalInfoMaskingPrompt(800, 1200), "塗らない対象");

    expect(notMasked).toContain("議員会館の住所");
    expect(notMasked).toContain("衆議院第一議員会館");
    expect(notMasked).toContain("衆議院第二議員会館");
    expect(notMasked).toContain("参議院議員会館");
    expect(notMasked).toContain("郵便番号・所在地・会館名・部屋番号");
  });

  it("議員会館以外の議員の住所と個人の住所は、塗る対象のまま", () => {
    const masked = section(buildPersonalInfoMaskingPrompt(800, 1200), "塗る対象");

    expect(masked).toContain("議員本人の住所（自宅・議員宿舎など");
    expect(masked).toContain("議員以外の個人（宿泊者・同行者・送付先の個人など）の住所・電話番号・郵便番号");
  });

  it("電話番号は、宛先が議員会館でも塗る対象のまま", () => {
    const masked = section(buildPersonalInfoMaskingPrompt(800, 1200), "塗る対象");

    expect(masked).toContain("議員本人の電話番号");
    expect(masked).toContain("宛先が議員会館でも電話番号は塗る");
  });

  it("議員会館の住所は、迷うものとして塗る側に倒さず、他の住所と並ぶときは議員会館の住所だけを塗らない", () => {
    const output = section(buildPersonalInfoMaskingPrompt(800, 1200), "出力");

    expect(output).toContain("発行元の情報と議員会館の住所は塗らない");
    expect(output).toContain("議員会館の住所だけを塗らず、それ以外の住所は塗る");
  });

  it("追加の指示が無ければ、追加の指示の節を含まない", () => {
    expect(buildPersonalInfoMaskingPrompt(800, 1200)).not.toContain("追加の指示");
    expect(buildPersonalInfoMaskingPrompt(800, 1200, null)).not.toContain("追加の指示");
  });

  it("追加の指示を、塗らない対象より優先し、出力の形式は変えないよう添える", () => {
    const prompt = buildPersonalInfoMaskingPrompt(800, 1200, "注文者の氏名も黒塗りにして");
    const extra = section(prompt, "この書類への追加の指示");

    expect(extra).toContain("<instruction>\n注文者の氏名も黒塗りにして\n</instruction>");
    expect(extra).toContain("「塗る対象」「塗らない対象」");
    expect(extra).toContain("より優先する");
    expect(extra).toContain("出力の形式");
    // 共通の決まりは変えずに残す
    expect(section(prompt, "出力")).toContain("発行元の情報と議員会館の住所は塗らない");
    expect(prompt.indexOf("■ 出力")).toBeLessThan(prompt.indexOf("■ この書類への追加の指示"));
  });
});
