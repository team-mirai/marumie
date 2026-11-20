"use server";
import { revalidatePath } from "next/cache";
import type { PoliticianInput, PoliticianProfileInput } from "@/shared/models/politician";
import { requireRole } from "@/server/contexts/auth/presentation/loaders/require-role";
import { requireResearchFundWriter } from "@/server/contexts/auth/presentation/loaders/require-research-fund-writer";
import { SavePoliticianUsecase } from "@/server/contexts/shared/application/usecases/save-politician-usecase";
import { SavePoliticianProfileUsecase } from "@/server/contexts/shared/application/usecases/save-politician-profile-usecase";
import { DeletePoliticianUsecase } from "@/server/contexts/shared/application/usecases/delete-politician-usecase";
import { UploadPoliticianPhotoUsecase } from "@/server/contexts/shared/application/usecases/upload-politician-photo-usecase";
import { DeletePoliticianPhotoUsecase } from "@/server/contexts/shared/application/usecases/delete-politician-photo-usecase";
import { SetPoliticianResearchFundComingSoonUsecase } from "@/server/contexts/shared/application/usecases/set-politician-research-fund-coming-soon-usecase";
import { SetPoliticianResearchFundPublicUsecase } from "@/server/contexts/shared/application/usecases/set-politician-research-fund-public-usecase";
import { PrismaPoliticianRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-politician.repository";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { SupabasePoliticianPhotoStorage } from "@/server/contexts/shared/infrastructure/storage/supabase-politician-photo-storage";
import { WebappCacheInvalidator } from "@/server/contexts/shared/infrastructure/services/webapp-cache-invalidator";

export async function savePolitician(id: string | null, input: PoliticianInput) {
  await requireRole("admin");
  try {
    const { cacheWarning } = await new SavePoliticianUsecase(
      new PrismaPoliticianRepository(prisma),
      new WebappCacheInvalidator(),
    ).execute(id, input);
    revalidatePath("/(auth)", "layout");
    return { success: true as const, cacheWarning };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "保存に失敗しました",
    };
  }
}
/**
 * プロフィール（ふりがな・院・選挙区・URL・SNS）だけを保存する。
 * 担当の議員室の research_fund ユーザーも使える（admin は全議員）。氏名・スラッグなどは変えない（#2031）
 */
export async function savePoliticianProfile(id: string, profile: PoliticianProfileInput) {
  await requireResearchFundWriter(id);
  try {
    const { cacheWarning } = await new SavePoliticianProfileUsecase(
      new PrismaPoliticianRepository(prisma),
      new WebappCacheInvalidator(),
    ).execute(id, profile);
    revalidatePath("/(auth)", "layout");
    return { success: true as const, cacheWarning };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "保存に失敗しました",
    };
  }
}
/**
 * 顔写真の登録・差し替え。FormData の "photo" に画像ファイルを入れて呼ぶ。
 * 担当の議員室の research_fund ユーザーも使える（admin は全議員。#2031）
 */
export async function uploadPoliticianPhoto(id: string, formData: FormData) {
  await requireResearchFundWriter(id);
  try {
    const file = formData.get("photo");
    if (!(file instanceof File)) throw new Error("画像ファイルを選択してください");
    const { cacheWarning } = await new UploadPoliticianPhotoUsecase(
      new PrismaPoliticianRepository(prisma),
      SupabasePoliticianPhotoStorage.fromEnv(),
      new WebappCacheInvalidator(),
    ).execute(id, new Uint8Array(await file.arrayBuffer()));
    revalidatePath("/(auth)", "layout");
    return { success: true as const, cacheWarning };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "顔写真の登録に失敗しました",
    };
  }
}
/** 顔写真の削除。担当の議員室の research_fund ユーザーも使える（admin は全議員。#2031） */
export async function deletePoliticianPhoto(id: string) {
  await requireResearchFundWriter(id);
  try {
    const { cacheWarning } = await new DeletePoliticianPhotoUsecase(
      new PrismaPoliticianRepository(prisma),
      SupabasePoliticianPhotoStorage.fromEnv(),
      new WebappCacheInvalidator(),
    ).execute(id);
    revalidatePath("/(auth)", "layout");
    return { success: true as const, cacheWarning };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "顔写真の削除に失敗しました",
    };
  }
}
/** まる見えで一般公開するかは運営がプレビューを確認して決めるので、担当の議員室ではなく admin だけが切り替えられる（#1894） */
export async function setPoliticianResearchFundPublic(id: string, isPublic: boolean) {
  await requireRole("admin");
  try {
    const result = await new SetPoliticianResearchFundPublicUsecase(
      new PrismaPoliticianRepository(prisma),
      new WebappCacheInvalidator(),
    ).execute(id, isPublic);
    revalidatePath("/(auth)", "layout");
    return { success: true as const, ...result };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "公開設定の変更に失敗しました",
    };
  }
}
/**
 * 調研費を非公開のまま、まる見えの議員一覧に「準備中」としてグレーで出すか（と添え書き）を切り替える。
 * 公開設定と同じく運営が決めるので admin だけ。note が null なら出さない
 */
export async function setPoliticianResearchFundComingSoon(id: string, note: string | null) {
  await requireRole("admin");
  try {
    const result = await new SetPoliticianResearchFundComingSoonUsecase(
      new PrismaPoliticianRepository(prisma),
      new WebappCacheInvalidator(),
    ).execute(id, note);
    revalidatePath("/(auth)", "layout");
    return { success: true as const, ...result };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "準備中の設定の変更に失敗しました",
    };
  }
}
export async function deletePolitician(id: string) {
  await requireRole("admin");
  try {
    await new DeletePoliticianUsecase(new PrismaPoliticianRepository(prisma), () =>
      SupabasePoliticianPhotoStorage.fromEnv(),
    ).execute(id);
    revalidatePath("/(auth)", "layout");
    return { success: true as const };
  } catch {
    return { success: false as const, error: "削除に失敗しました。もう一度お試しください" };
  }
}
