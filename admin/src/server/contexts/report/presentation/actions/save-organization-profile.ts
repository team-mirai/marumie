"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaOrganizationReportProfileRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-organization-report-profile.repository";
import { SaveOrganizationProfileUsecase } from "@/server/contexts/report/application/usecases/save-organization-profile-usecase";
import type { OrganizationReportProfileDetails } from "@/server/contexts/report/domain/models/organization-report-profile";

export interface SaveOrganizationProfileData {
  id?: string;
  politicalOrganizationId: string;
  financialYear: number;
  officialName?: string | null;
  officialNameKana?: string | null;
  officeAddress?: string | null;
  officeAddressBuilding?: string | null;
  details?: OrganizationReportProfileDetails;
}

export async function saveOrganizationProfile(data: SaveOrganizationProfileData) {
  try {
    const repository = new PrismaOrganizationReportProfileRepository(prisma);
    const usecase = new SaveOrganizationProfileUsecase(repository);

    const profile = await usecase.execute({
      id: data.id,
      politicalOrganizationId: data.politicalOrganizationId,
      financialYear: data.financialYear,
      officialName: data.officialName,
      officialNameKana: data.officialNameKana,
      officeAddress: data.officeAddress,
      officeAddressBuilding: data.officeAddressBuilding,
      details: data.details,
    });

    revalidatePath(`/political-organizations/${data.politicalOrganizationId}/report-profile`);
    return { success: true, profile };
  } catch (error) {
    console.error("Error saving organization profile:", error);
    throw new Error(
      error instanceof Error ? error.message : "報告書プロフィールの保存に失敗しました",
    );
  }
}
