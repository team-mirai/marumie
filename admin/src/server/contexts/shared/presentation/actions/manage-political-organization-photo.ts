"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/server/contexts/auth/presentation/loaders/require-role";
import { UploadPoliticalOrganizationPhotoUsecase } from "@/server/contexts/shared/application/usecases/upload-political-organization-photo-usecase";
import { DeletePoliticalOrganizationPhotoUsecase } from "@/server/contexts/shared/application/usecases/delete-political-organization-photo-usecase";
import { PrismaPoliticalOrganizationRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-political-organization.repository";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { SupabasePoliticianPhotoStorage } from "@/server/contexts/shared/infrastructure/storage/supabase-politician-photo-storage";

/** 代表者の顔写真の登録・差し替え。FormData の "photo" に画像ファイルを入れて呼ぶ */
export async function uploadPoliticalOrganizationPhoto(id: string, formData: FormData) {
  await requireRole("political_fund");
  try {
    const file = formData.get("photo");
    if (!(file instanceof File)) throw new Error("画像ファイルを選択してください");
    await new UploadPoliticalOrganizationPhotoUsecase(
      new PrismaPoliticalOrganizationRepository(prisma),
      SupabasePoliticianPhotoStorage.fromEnv(),
    ).execute(id, new Uint8Array(await file.arrayBuffer()));
    revalidatePath("/political-organizations", "layout");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "顔写真の登録に失敗しました",
    };
  }
}

export async function deletePoliticalOrganizationPhoto(id: string) {
  await requireRole("political_fund");
  try {
    await new DeletePoliticalOrganizationPhotoUsecase(
      new PrismaPoliticalOrganizationRepository(prisma),
      SupabasePoliticianPhotoStorage.fromEnv(),
    ).execute(id);
    revalidatePath("/political-organizations", "layout");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "顔写真の削除に失敗しました",
    };
  }
}
