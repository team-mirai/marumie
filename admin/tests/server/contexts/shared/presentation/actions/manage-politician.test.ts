import type { AuthUser } from "@/server/contexts/auth/domain/models/auth-user";
import type { UserRole } from "@/server/contexts/auth/domain/models/user-role";
import { getCurrentUser } from "@/server/contexts/auth/presentation/loaders/load-current-user";
import {
  deletePoliticianPhoto,
  savePolitician,
  savePoliticianProfile,
  setPoliticianResearchFundPublic,
  uploadPoliticianPhoto,
} from "@/server/contexts/shared/presentation/actions/manage-politician";
import { PrismaPoliticianRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-politician.repository";
import { PrismaUserRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-user.repository";
import { WebappCacheInvalidator } from "@/server/contexts/shared/infrastructure/services/webapp-cache-invalidator";
import { SupabasePoliticianPhotoStorage } from "@/server/contexts/shared/infrastructure/storage/supabase-politician-photo-storage";
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
    nameKana: "",
    house: "",
    constituency: "",
    profileUrl: "",
    websiteUrl: "",
    snsUrls: [],
    photoPath: null,
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

const profile = {
  nameKana: "ぎいんめい",
  house: "sangiin" as const,
  constituency: "比例",
  profileUrl: "https://team-mir.ai/member/test",
  websiteUrl: "https://example.com",
  snsUrls: ["https://x.com/test"],
};

describe("savePoliticianProfile（担当の議員室もプロフィールを編集できる。#2031）", () => {
  let save: jest.SpyInstance;
  beforeEach(() => {
    save = jest.spyOn(PrismaPoliticianRepository.prototype, "save").mockResolvedValue();
  });

  it("担当の議員の research_fund ユーザーはプロフィールを保存でき、氏名・スラッグ・当選日・所属は変わらない", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(userWith(["research_fund"]));

    await expect(
      savePoliticianProfile("1", {
        ...profile,
        // 画面を経由せずに直接呼ばれても、プロフィール以外の項目は無視する
        name: "別の名前",
        slug: "other",
        termStart: "2020-01-01",
        politicalOrganizationId: "9",
      } as typeof profile),
    ).resolves.toEqual({ success: true, cacheWarning: null });
    expect(save).toHaveBeenCalledWith("1", {
      name: "議員名",
      slug: "test-member",
      termStart: "2026-02-08",
      politicalOrganizationId: "",
      ...profile,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/(auth)", "layout");
  });

  it("担当外の議員のプロフィールは research_fund ユーザーが保存できない", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(userWith(["research_fund"]));

    await expect(savePoliticianProfile("2", profile)).rejects.toThrow(
      "担当外の議員室のため閲覧のみです",
    );
    expect(save).not.toHaveBeenCalled();
  });

  it("admin は担当に関係なく保存できる", async () => {
    jest.spyOn(PrismaUserRepository.prototype, "findAssignedPoliticianIds").mockResolvedValue([]);
    (getCurrentUser as jest.Mock).mockResolvedValue(userWith(["admin"]));

    await expect(savePoliticianProfile("1", profile)).resolves.toEqual({ success: true, cacheWarning: null });
    expect(save).toHaveBeenCalled();
  });

  it.each([[["political_fund"]], [[]]] as const)(
    "research_fund ロールが無いユーザー（%j）は保存できない",
    async (roles) => {
      (getCurrentUser as jest.Mock).mockResolvedValue(userWith([...roles]));

      await expect(savePoliticianProfile("1", profile)).rejects.toThrow(
        "この機能を使う権限がありません",
      );
      expect(save).not.toHaveBeenCalled();
    },
  );
});

describe("savePolitician（全項目の保存）", () => {
  it("担当の議員の research_fund ユーザーでも、admin でなければ拒否される", async () => {
    const save = jest.spyOn(PrismaPoliticianRepository.prototype, "save").mockResolvedValue();
    (getCurrentUser as jest.Mock).mockResolvedValue(userWith(["research_fund"]));

    await expect(
      savePolitician("1", {
        name: "別の名前",
        slug: "other",
        termStart: "2026-02-08",
        politicalOrganizationId: "",
        ...profile,
      }),
    ).rejects.toThrow("この機能を使う権限がありません");
    expect(save).not.toHaveBeenCalled();
  });
});

describe("顔写真の登録・削除", () => {
  let setPhotoPath: jest.SpyInstance;
  beforeEach(() => {
    setPhotoPath = jest.spyOn(PrismaPoliticianRepository.prototype, "setPhotoPath").mockResolvedValue();
  });
  const photoForm = () => {
    const formData = new FormData();
    formData.append("photo", new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])]), "a.jpg");
    return formData;
  };

  const mockStorage = () => {
    const storage = {
      upload: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    jest
      .spyOn(SupabasePoliticianPhotoStorage, "fromEnv")
      .mockReturnValue(storage as unknown as SupabasePoliticianPhotoStorage);
    return storage;
  };

  it("political_fund ユーザーは登録・削除できない", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(userWith(["political_fund"]));
    await expect(uploadPoliticianPhoto("1", photoForm())).rejects.toThrow(
      "この機能を使う権限がありません",
    );
    await expect(deletePoliticianPhoto("1")).rejects.toThrow("この機能を使う権限がありません");
    expect(setPhotoPath).not.toHaveBeenCalled();
  });

  it("担当外の議員の顔写真は research_fund ユーザーが登録・削除できない", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(userWith(["research_fund"]));
    await expect(uploadPoliticianPhoto("2", photoForm())).rejects.toThrow(
      "担当外の議員室のため閲覧のみです",
    );
    await expect(deletePoliticianPhoto("2")).rejects.toThrow("担当外の議員室のため閲覧のみです");
    expect(setPhotoPath).not.toHaveBeenCalled();
  });

  it.each([[["research_fund"]], [["admin"]]] as const)(
    "担当の議員の research_fund ユーザーと admin（%j）は登録・削除できる",
    async (roles) => {
      mockStorage();
      (getCurrentUser as jest.Mock).mockResolvedValue(userWith([...roles]));
      await expect(uploadPoliticianPhoto("1", photoForm())).resolves.toEqual({ success: true, cacheWarning: null });
      expect(setPhotoPath).toHaveBeenCalledWith("1", expect.any(String));
      setPhotoPath.mockClear();
      jest.spyOn(PrismaPoliticianRepository.prototype, "findById").mockResolvedValue({
        id: "1",
        name: "議員名",
        slug: "test-member",
        termStart: "2026-02-08",
        politicalOrganizationId: "",
        politicalOrganizationName: null,
        isResearchFundPublic: false,
        ...profile,
        photoPath: "politicians/1/a.jpg",
      });
      await expect(deletePoliticianPhoto("1")).resolves.toEqual({ success: true, cacheWarning: null });
      expect(setPhotoPath).toHaveBeenCalledWith("1", null);
    },
  );

  it("ファイルが無ければエラーを返す", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(userWith(["admin"]));
    await expect(uploadPoliticianPhoto("1", new FormData())).resolves.toEqual({
      success: false,
      error: "画像ファイルを選択してください",
    });
    expect(setPhotoPath).not.toHaveBeenCalled();
  });
});
