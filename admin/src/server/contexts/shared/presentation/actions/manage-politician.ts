"use server";
import { revalidatePath } from "next/cache";
import type { PoliticianInput } from "@/shared/models/politician";
import { requireRole } from "@/server/contexts/auth/presentation/loaders/require-role";
import { SavePoliticianUsecase } from "@/server/contexts/shared/application/usecases/save-politician-usecase";
import { DeletePoliticianUsecase } from "@/server/contexts/shared/application/usecases/delete-politician-usecase";
import { UploadPoliticianPhotoUsecase } from "@/server/contexts/shared/application/usecases/upload-politician-photo-usecase";
import { DeletePoliticianPhotoUsecase } from "@/server/contexts/shared/application/usecases/delete-politician-photo-usecase";
import { SetPoliticianResearchFundPublicUsecase } from "@/server/contexts/shared/application/usecases/set-politician-research-fund-public-usecase";
import { PrismaPoliticianRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-politician.repository";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { SupabasePoliticianPhotoStorage } from "@/server/contexts/shared/infrastructure/storage/supabase-politician-photo-storage";
import { WebappCacheInvalidator } from "@/server/contexts/shared/infrastructure/services/webapp-cache-invalidator";

export async function savePolitician(id: string | null, input: PoliticianInput) {
  await requireRole("admin");
  try {
    await new SavePoliticianUsecase(new PrismaPoliticianRepository(prisma)).execute(id, input);
    revalidatePath("/(auth)", "layout");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "保存に失敗しました",
    };
  }
}
/** 顔写真の登録・差し替え。FormData の "photo" に画像ファイルを入れて呼ぶ */
export async function uploadPoliticianPhoto(id: string, formData: FormData) {
  await requireRole("admin");
  try {
    const file = formData.get("photo");
    if (!(file instanceof File)) throw new Error("画像ファイルを選択してください");
    await new UploadPoliticianPhotoUsecase(
      new PrismaPoliticianRepository(prisma),
      SupabasePoliticianPhotoStorage.fromEnv(),
    ).execute(id, new Uint8Array(await file.arrayBuffer()));
    revalidatePath("/(auth)", "layout");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "顔写真の登録に失敗しました",
    };
  }
}
export async function deletePoliticianPhoto(id: string) {
  await requireRole("admin");
  try {
    await new DeletePoliticianPhotoUsecase(
      new PrismaPoliticianRepository(prisma),
      SupabasePoliticianPhotoStorage.fromEnv(),
    ).execute(id);
    revalidatePath("/(auth)", "layout");
    return { success: true as const };
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
