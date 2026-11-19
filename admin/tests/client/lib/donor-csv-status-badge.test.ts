import { resolveDonorCsvStatusBadge } from "@/client/lib/donor-csv-status-badge";

describe("resolveDonorCsvStatusBadge", () => {
  it("正常は teal 塗り（accent 背景・teal-deep 文字）になる", () => {
    const badge = resolveDonorCsvStatusBadge("valid");
    expect(badge.label).toBe("正常");
    expect(badge.className).toContain("bg-accent");
    expect(badge.className).toContain("text-primary-active");
  });

  it("取引なしはグレー系（secondary 背景・muted 文字）になる", () => {
    const badge = resolveDonorCsvStatusBadge("transaction_not_found");
    expect(badge.label).toBe("取引なし");
    expect(badge.className).toContain("bg-secondary");
    expect(badge.className).toContain("text-muted-foreground");
  });

  it("エラーと種別不整合は赤枠・赤文字の白地になる", () => {
    for (const status of ["invalid", "type_mismatch"] as const) {
      const badge = resolveDonorCsvStatusBadge(status);
      expect(badge.className).toContain("border-destructive");
      expect(badge.className).toContain("text-destructive");
      expect(badge.className).toContain("bg-card");
    }
    expect(resolveDonorCsvStatusBadge("invalid").label).toBe("エラー");
    expect(resolveDonorCsvStatusBadge("type_mismatch").label).toBe("種別不整合");
  });

  it("旧テーマの Tailwind パレット直書きを含まない", () => {
    for (const status of ["valid", "invalid", "transaction_not_found", "type_mismatch"] as const) {
      expect(resolveDonorCsvStatusBadge(status).className).not.toMatch(
        /(red|green|blue|yellow|purple|orange|gray|slate|amber|emerald)-\d{3}/,
      );
    }
  });
});
