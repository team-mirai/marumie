import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";
import type { AuthUser } from "@/server/contexts/auth/domain/models/auth-user";
import type { UserRole } from "@/server/contexts/auth/domain/models/user-role";
import { getCurrentUser } from "@/server/contexts/auth/presentation/loaders/load-current-user";
import { requireRole } from "@/server/contexts/auth/presentation/loaders/require-role";
import {
  loadResearchFundWritePermission,
  requireResearchFundWriter,
} from "@/server/contexts/auth/presentation/loaders/require-research-fund-writer";
import { PrismaUserRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-user.repository";

jest.mock("react", () => ({ ...jest.requireActual("react"), cache: (fn: unknown) => fn }));
jest.mock("@/server/contexts/auth/presentation/loaders/load-current-user", () => ({
  getCurrentUser: jest.fn(),
}));
jest.mock("@/server/contexts/auth/presentation/loaders/require-role", () => ({
  requireRole: jest.fn(),
}));
jest.mock("@/server/contexts/shared/infrastructure/prisma", () => ({ prisma: {} }));

const userWith = (roles: UserRole[]): AuthUser => ({
  id: "user-1",
  authId: "auth-1",
  email: "user@example.com",
  roles,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
});

let findAssigned: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  findAssigned = jest
    .spyOn(PrismaUserRepository.prototype, "findAssignedPoliticianIds")
    .mockResolvedValue(["1"]);
});
afterEach(() => jest.restoreAllMocks());

describe("requireResearchFundWriter", () => {
  it("担当の議員なら書き込める（research_fund ロールの確認も通す）", async () => {
    const user = userWith(["research_fund"]);
    jest.mocked(requireRole).mockResolvedValue(user);

    await expect(requireResearchFundWriter("1")).resolves.toBe(user);
    expect(requireRole).toHaveBeenCalledWith("research_fund");
    expect(findAssigned).toHaveBeenCalledWith("user-1");
  });

  it("担当外の議員への書き込みは INSUFFICIENT_PERMISSION で拒否する", async () => {
    jest.mocked(requireRole).mockResolvedValue(userWith(["research_fund"]));

    const error = await requireResearchFundWriter("2").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AuthError);
    expect(error).toMatchObject({ code: "INSUFFICIENT_PERMISSION" });
  });

  it("admin は担当が無くても全議員に書き込める", async () => {
    findAssigned.mockResolvedValue([]);
    const user = userWith(["admin"]);
    jest.mocked(requireRole).mockResolvedValue(user);

    await expect(requireResearchFundWriter("2")).resolves.toBe(user);
    expect(findAssigned).not.toHaveBeenCalled();
  });

  it("ロールの確認で落ちたら（未認証・research_fund なし）担当を見ずにそのまま投げる", async () => {
    jest
      .mocked(requireRole)
      .mockRejectedValue(new AuthError("INSUFFICIENT_PERMISSION", "この機能を使う権限がありません"));

    await expect(requireResearchFundWriter("1")).rejects.toThrow("この機能を使う権限がありません");
    expect(findAssigned).not.toHaveBeenCalled();
  });
});

describe("loadResearchFundWritePermission", () => {
  it("担当内・担当外で書き込みの可否が変わる", async () => {
    jest.mocked(getCurrentUser).mockResolvedValue(userWith(["research_fund"]));

    const canWrite = await loadResearchFundWritePermission();
    expect(canWrite("1")).toBe(true);
    expect(canWrite("2")).toBe(false);
  });

  it("admin はすべての議員に書き込める", async () => {
    jest.mocked(getCurrentUser).mockResolvedValue(userWith(["admin"]));

    const canWrite = await loadResearchFundWritePermission();
    expect(canWrite("2")).toBe(true);
  });

  it("未認証ならどの議員にも書き込めない", async () => {
    jest.mocked(getCurrentUser).mockResolvedValue(null);

    const canWrite = await loadResearchFundWritePermission();
    expect(canWrite("1")).toBe(false);
  });
});
