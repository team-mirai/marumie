import { resolveAssignmentStatusBadge } from "@/client/lib/assignment-status-badge";

describe("resolveAssignmentStatusBadge", () => {
  it("紐付け済みは teal 系のピル（accent 背景・teal-deep 文字）になる", () => {
    const badge = resolveAssignmentStatusBadge(true);
    expect(badge.label).toBe("紐付け済み");
    expect(badge.className).toContain("bg-accent");
    expect(badge.className).toContain("text-primary-active");
  });

  it("未紐付けはグレー系のピル（secondary 背景・muted 文字）になる", () => {
    const badge = resolveAssignmentStatusBadge(false);
    expect(badge.label).toBe("未紐付け");
    expect(badge.className).toContain("bg-secondary");
    expect(badge.className).toContain("text-muted-foreground");
  });

  it("旧テーマの Tailwind パレット直書きを含まない", () => {
    for (const assigned of [true, false]) {
      expect(resolveAssignmentStatusBadge(assigned).className).not.toMatch(
        /(red|green|blue|yellow|purple|orange|gray|slate|amber)-\d{3}/,
      );
    }
  });
});
