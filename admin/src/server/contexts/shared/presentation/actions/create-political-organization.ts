"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaPoliticalOrganizationRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-political-organization.repository";
import { CreatePoliticalOrganizationUsecase } from "@/server/contexts/shared/application/usecases/create-political-organization-usecase";
import { requireRole } from "@/server/contexts/auth/presentation/loaders/require-role";
import { PoliticalOrganizationInputError } from "@/server/contexts/shared/domain/errors/political-organization-input-error";

const repository = new PrismaPoliticalOrganizationRepository(prisma);
const usecase = new CreatePoliticalOrganizationUsecase(repository);

export interface CreatePoliticalOrganizationData {
  displayName: string;
  orgName?: string;
  slug: string;
  description?: string;
}

export async function createPoliticalOrganization(data: CreatePoliticalOrganizationData) {
  await requireRole("political_fund");

  try {
    const { displayName, orgName, slug, description } = data;

    await usecase.execute(displayName, slug, orgName, description);

    revalidatePath("/political-organizations");
    return { success: true as const };
  } catch (error) {
    console.error("Error creating political organization:", error);
    // 入力の誤りを画面に出せるよう、例外ではなく結果で返す（本番では例外のメッセージが伏せられる）
    return { success: false as const, error: toErrorMessage(error) };
  }
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.includes("Unique constraint")) {
    return "このスラッグは既に使用されています";
  }
  // 内部のメッセージ（DB のエラーなど）は画面に出さない
  if (error instanceof PoliticalOrganizationInputError) return error.message;
  return "政治団体の作成に失敗しました";
}
