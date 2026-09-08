import { resolveUserRoleBadge } from "@/client/lib/user-role-badge";

describe("resolveUserRoleBadge", () => {
  it("admin は teal 系のピル（accent 背景・teal-deep 文字）になる", () => {
    const badge = resolveUserRoleBadge("admin");
    expect(badge.label).toBe("admin");
    expect(badge.className).toContain("bg-accent");
    expect(badge.className).toContain("text-primary-active");
  });

  it("user はグレー系のピル（secondary 背景・muted 文字）になる", () => {
    const badge = resolveUserRoleBadge("user");
    expect(badge.label).toBe("user");
    expect(badge.className).toContain("bg-secondary");
    expect(badge.className).toContain("text-muted-foreground");
  });

  it("旧テーマの Tailwind パレット直書き（red/green）を含まない", () => {
    for (const role of ["admin", "user"] as const) {
      expect(resolveUserRoleBadge(role).className).not.toMatch(/(red|green)-\d{3}/);
    }
  });
});
