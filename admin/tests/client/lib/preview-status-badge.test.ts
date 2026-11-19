import { resolvePreviewStatusBadge } from "@/client/lib/preview-status-badge";

describe("resolvePreviewStatusBadge", () => {
  it("挿入は teal 塗り（accent 背景・teal-deep 文字）になる", () => {
    const badge = resolvePreviewStatusBadge("insert");
    expect(badge.label).toBe("挿入");
    expect(badge.className).toContain("bg-accent");
    expect(badge.className).toContain("text-primary-active");
  });

  it("更新は teal 枠の白地になる", () => {
    const badge = resolvePreviewStatusBadge("update");
    expect(badge.label).toBe("更新");
    expect(badge.className).toContain("border-primary-active");
    expect(badge.className).toContain("bg-card");
  });

  it("スキップはグレー系（secondary 背景・muted 文字）になる", () => {
    const badge = resolvePreviewStatusBadge("skip");
    expect(badge.label).toBe("スキップ");
    expect(badge.className).toContain("bg-secondary");
    expect(badge.messageClassName).toBe("text-muted-foreground");
  });

  it("無効は赤枠・赤文字になり、理由文も赤になる", () => {
    const badge = resolvePreviewStatusBadge("invalid");
    expect(badge.label).toBe("無効");
    expect(badge.className).toContain("border-destructive");
    expect(badge.messageClassName).toBe("text-destructive");
  });

  it("旧テーマの Tailwind パレット直書きを含まない", () => {
    for (const status of ["insert", "update", "skip", "invalid"] as const) {
      const badge = resolvePreviewStatusBadge(status);
      expect(`${badge.className} ${badge.messageClassName}`).not.toMatch(
        /(red|green|blue|yellow|purple|orange|gray|slate|amber)-\d{3}/,
      );
    }
  });
});
