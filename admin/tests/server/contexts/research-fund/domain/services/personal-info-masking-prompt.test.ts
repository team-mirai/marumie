import { buildPersonalInfoMaskingPrompt } from "@/server/contexts/research-fund/domain/services/personal-info-masking-prompt";

describe("buildPersonalInfoMaskingPrompt", () => {
  it("画像の大きさと、塗る対象・塗らない対象を含む", () => {
    const prompt = buildPersonalInfoMaskingPrompt(800, 1200);

    expect(prompt).toContain("幅 800 画素 × 高さ 1200 画素");
    expect(prompt).toContain("議員本人の電話番号");
    expect(prompt).toContain("店舗・事業者・発行元");
  });
});
