"use client";
import "client-only";

import { useState } from "react";
import { saveOrganizationProfile } from "@/server/contexts/report/presentation/actions/save-organization-profile";
import type { OrganizationReportProfile } from "@/server/contexts/report/domain/models/organization-report-profile";
import { BasicInfoSection } from "./BasicInfoSection";
import { RepresentativeSection } from "./RepresentativeSection";
import { ContactPersonsSection } from "./ContactPersonsSection";
import { OrganizationTypeSection } from "./OrganizationTypeSection";
import { FundManagementSection } from "./FundManagementSection";
import { DietMemberRelationSection } from "./DietMemberRelationSection";
import type { OrganizationReportProfileFormData } from "@/server/contexts/report/presentation/schemas/organization-report-profile.schema";

interface ReportProfileFormProps {
  politicalOrganizationId: string;
  financialYear: number;
  initialData: OrganizationReportProfile | null;
}

export function ReportProfileForm({
  politicalOrganizationId,
  financialYear,
  initialData,
}: ReportProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<OrganizationReportProfileFormData>({
    id: initialData?.id,
    politicalOrganizationId,
    financialYear,
    officialName: initialData?.officialName ?? "",
    officialNameKana: initialData?.officialNameKana ?? "",
    officeAddress: initialData?.officeAddress ?? "",
    officeAddressBuilding: initialData?.officeAddressBuilding ?? "",
    details: initialData?.details ?? {},
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await saveOrganizationProfile({
        id: formData.id,
        politicalOrganizationId: formData.politicalOrganizationId,
        financialYear: formData.financialYear,
        officialName: formData.officialName || null,
        officialNameKana: formData.officialNameKana || null,
        officeAddress: formData.officeAddress || null,
        officeAddressBuilding: formData.officeAddressBuilding || null,
        details: formData.details,
      });

      if (result.success) {
        setSuccess(true);
        setFormData((prev: OrganizationReportProfileFormData) => ({
          ...prev,
          id: result.profile.id,
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (
    updates: Partial<OrganizationReportProfileFormData>,
  ) => {
    setFormData((prev: OrganizationReportProfileFormData) => ({
      ...prev,
      ...updates,
    }));
  };

  const updateDetails = (
    updates: Partial<OrganizationReportProfileFormData["details"]>,
  ) => {
    setFormData((prev: OrganizationReportProfileFormData) => ({
      ...prev,
      details: { ...prev.details, ...updates },
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="text-red-500 p-3 bg-red-900/20 rounded-lg border border-red-900/30">
          {error}
        </div>
      )}

      {success && (
        <div className="text-green-500 p-3 bg-green-900/20 rounded-lg border border-green-900/30">
          保存しました
        </div>
      )}

      <BasicInfoSection formData={formData} updateFormData={updateFormData} />

      <RepresentativeSection
        details={formData.details}
        updateDetails={updateDetails}
      />

      <ContactPersonsSection
        details={formData.details}
        updateDetails={updateDetails}
      />

      <OrganizationTypeSection
        details={formData.details}
        updateDetails={updateDetails}
      />

      <FundManagementSection
        details={formData.details}
        updateDetails={updateDetails}
      />

      <DietMemberRelationSection
        details={formData.details}
        updateDetails={updateDetails}
      />

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className={`bg-primary-accent text-white border-0 rounded-lg px-4 py-2.5 font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-accent ${
            isLoading
              ? "opacity-60 cursor-not-allowed"
              : "hover:bg-blue-600 cursor-pointer"
          }`}
        >
          {isLoading ? "保存中..." : "保存"}
        </button>
      </div>
    </form>
  );
}
