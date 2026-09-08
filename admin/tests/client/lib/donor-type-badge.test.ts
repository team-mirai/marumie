import { resolveDonorTypeBadge } from "@/client/lib/donor-type-badge";
import { VALID_DONOR_TYPES } from "@/server/contexts/report/domain/models/donor";

describe("resolveDonorTypeBadge", () => {
  it("個人は teal 系のピル（accent 背景・teal-deep 文字）になる", () => {
    const badge = resolveDonorTypeBadge("individual");
    expect(badge.label).toBe("個人");
    expect(badge.className).toContain("bg-accent");
    expect(badge.className).toContain("text-primary-active");
  });

  it("法人はグレー系のピル（secondary 背景・muted 文字）になる", () => {
    const badge = resolveDonorTypeBadge("corporation");
    expect(badge.label).toBe("法人");
    expect(badge.className).toContain("bg-secondary");
    expect(badge.className).toContain("text-muted-foreground");
  });

  it("政治団体は黒枠白地のピルになる", () => {
    const badge = resolveDonorTypeBadge("political_organization");
    expect(badge.label).toBe("政治団体");
    expect(badge.className).toContain("border-border");
    expect(badge.className).toContain("bg-card");
  });

  it("すべての種別で旧テーマの Tailwind パレット直書きを含まない", () => {
    for (const type of VALID_DONOR_TYPES) {
      expect(resolveDonorTypeBadge(type).className).not.toMatch(
        /(red|green|blue|yellow|purple|orange|gray|slate)-\d{3}/,
      );
    }
  });
});
