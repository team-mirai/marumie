import type { AuthUser } from "@/server/contexts/auth/domain/models/auth-user";
import type { UserRole } from "@/server/contexts/auth/domain/models/user-role";
import { getCurrentUser } from "@/server/contexts/auth/presentation/loaders/load-current-user";
import { setPoliticianResearchFundPublic } from "@/server/contexts/shared/presentation/actions/manage-politician";
import { PrismaPoliticianRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-politician.repository";
import { PrismaUserRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-user.repository";
import { WebappCacheInvalidator } from "@/server/contexts/shared/infrastructure/services/webapp-cache-invalidator";
import { revalidatePath } from "next/cache";

jest.mock("@/server/contexts/auth/presentation/loaders/load-current-user", () => ({
  getCurrentUser: jest.fn(),
}));
jest.mock("@/server/contexts/shared/infrastructure/prisma", () => ({ prisma: {} }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

const userWith = (roles: UserRole[]): AuthUser => ({
  id: "user-1",
  authId: "auth-1",
  email: "user@example.com",
  roles,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
});

let setResearchFundPublic: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(PrismaPoliticianRepository.prototype, "findById").mockResolvedValue({
    id: "1",
    name: "議員名",
    slug: "test-member",
    termStart: "2026-02-08",
    politicalOrganizationId: "",
    politicalOrganizationName: null,
    isResearchFundPublic: false,
  });
  setResearchFundPublic = jest
    .spyOn(PrismaPoliticianRepository.prototype, "setResearchFundPublic")
    .mockResolvedValue();
  jest.spyOn(WebappCacheInvalidator.prototype, "invalidateWebappCache").mockResolvedValue();
  // 担当の議員室かどうかに関わらず admin だけが切り替えられることを確かめるため、議員 1 を担当にしておく
  jest.spyOn(PrismaUserRepository.prototype, "findAssignedPoliticianIds").mockResolvedValue(["1"]);
});
afterEach(() => jest.restoreAllMocks());

describe("setPoliticianResearchFundPublic", () => {
  it("admin は調研費の公開を切り替えられる", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(userWith(["admin"]));

    await expect(setPoliticianResearchFundPublic("1", true)).resolves.toEqual({
      success: true,
      cacheWarning: null,
    });
    expect(setResearchFundPublic).toHaveBeenCalledWith("1", true);
    expect(revalidatePath).toHaveBeenCalledWith("/(auth)", "layout");
  });

  it("担当の議員室の research_fund ユーザーでも、admin でなければ拒否され公開状態は変わらない", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(userWith(["research_fund"]));

    await expect(setPoliticianResearchFundPublic("1", true)).rejects.toThrow(
      "この機能を使う権限がありません",
    );
    expect(setResearchFundPublic).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("political_fund ユーザーも拒否され公開状態は変わらない", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(userWith(["political_fund"]));

    await expect(setPoliticianResearchFundPublic("1", false)).rejects.toThrow(
      "この機能を使う権限がありません",
    );
    expect(setResearchFundPublic).not.toHaveBeenCalled();
  });

  it("未ログインなら拒否され公開状態は変わらない", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(null);

    await expect(setPoliticianResearchFundPublic("1", true)).rejects.toThrow("認証が必要です");
    expect(setResearchFundPublic).not.toHaveBeenCalled();
  });
});
