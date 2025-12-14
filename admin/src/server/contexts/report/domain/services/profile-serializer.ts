/**
 * Profile Serializer
 *
 * Serializes organization report profile into XML format for SYUUSHI07_01.
 * This layer is responsible only for XML generation.
 */

import { fragment } from "xmlbuilder2";
import type { XMLBuilder } from "xmlbuilder2/lib/interfaces";
import type {
  OrganizationReportProfile,
  OrganizationReportProfileDetails,
} from "@/server/contexts/report/domain/models/organization-report-profile";

/**
 * Serializes an OrganizationReportProfile into XML format for SYUUSHI07_01.
 */
export function serializeProfileSection(
  profile: OrganizationReportProfile,
): XMLBuilder {
  const frag = fragment();
  const root = frag.ele("SYUUSHI07_01");
  const details = profile.details;

  root.ele("HOUKOKU_NEN").txt(profile.financialYear.toString());
  root.ele("KAISAI_DT").txt(details.specificPartyDate ?? "");
  root.ele("DANTAI_NM").txt(profile.officialName ?? "");
  root.ele("DANTAI_KANA").txt(profile.officialNameKana ?? "");
  root.ele("JIM_ADR").txt(profile.officeAddress ?? "");
  root.ele("JIM_APA_ADR").txt(profile.officeAddressBuilding ?? "");

  serializeRepresentative(root, details);
  serializeAccountant(root, details);
  serializeContactPersons(root, details);
  serializeOrganizationType(root, details);
  serializeFundManagement(root, details);
  serializeDietMemberRelation(root, details);

  return frag;
}

function serializeRepresentative(
  root: XMLBuilder,
  details: OrganizationReportProfileDetails,
): void {
  root.ele("DAI_NM1").txt(details.representative?.lastName ?? "");
  root.ele("DAI_NM2").txt(details.representative?.firstName ?? "");
}

function serializeAccountant(
  root: XMLBuilder,
  details: OrganizationReportProfileDetails,
): void {
  root.ele("KAI_NM1").txt(details.accountant?.lastName ?? "");
  root.ele("KAI_NM2").txt(details.accountant?.firstName ?? "");
}

function serializeContactPersons(
  root: XMLBuilder,
  details: OrganizationReportProfileDetails,
): void {
  const contactPersons = details.contactPersons ?? [];

  // 仕様: TANTOU1_NM1, TANTOU2_NM1, TANTOU3_NM1 (1始まり)
  for (let i = 0; i < 3; i++) {
    const person = contactPersons[i];
    const suffix = (i + 1).toString();

    root.ele(`TANTOU${suffix}_NM1`).txt(person?.lastName ?? "");
    root.ele(`TANTOU${suffix}_NM2`).txt(person?.firstName ?? "");
    root.ele(`TANTOU${suffix}_TEL`).txt(person?.tel ?? "");
  }
}

function serializeOrganizationType(
  root: XMLBuilder,
  details: OrganizationReportProfileDetails,
): void {
  root.ele("DANTAI_KBN").txt(details.organizationType ?? "");
  root.ele("KATU_KUKI").txt(details.activityArea ?? "");
}

function serializeFundManagement(
  root: XMLBuilder,
  details: OrganizationReportProfileDetails,
): void {
  const fundManagement = details.fundManagement;
  const hasFundManagement = !!fundManagement;

  root.ele("SIKIN_UMU").txt(hasFundManagement ? "1" : "0");

  if (hasFundManagement) {
    root.ele("KOSYOKU_NM").txt(fundManagement.publicPositionName ?? "");
    root.ele("KOSYOKU_KBN").txt(fundManagement.publicPositionType ?? "");
    root.ele("SIKIN_TODOKE_NM1").txt(fundManagement.applicant?.lastName ?? "");
    root.ele("SIKIN_TODOKE_NM2").txt(fundManagement.applicant?.firstName ?? "");

    // 仕様: 1件目は SIKIN_KIKAN1, SIKIN_KIKAN2
    //       2件目以降は SIKIN_KIKAN_FUKUSU にカンマ区切りで出力
    const periods = fundManagement.periods ?? [];
    if (periods.length > 0) {
      root.ele("SIKIN_KIKAN1").txt(periods[0]?.from ?? "");
      root.ele("SIKIN_KIKAN2").txt(periods[0]?.to ?? "");
    } else {
      root.ele("SIKIN_KIKAN1");
      root.ele("SIKIN_KIKAN2");
    }

    // 2件目以降をカンマ区切りで SIKIN_KIKAN_FUKUSU に出力
    if (periods.length > 1) {
      const fukusuPeriods = periods
        .slice(1)
        .map((p) => `${p.from}～${p.to}`)
        .join(",");
      root.ele("SIKIN_KIKAN_FUKUSU").txt(fukusuPeriods);
    } else {
      root.ele("SIKIN_KIKAN_FUKUSU");
    }
  } else {
    root.ele("KOSYOKU_NM");
    root.ele("KOSYOKU_KBN");
    root.ele("SIKIN_TODOKE_NM1");
    root.ele("SIKIN_TODOKE_NM2");
    root.ele("SIKIN_KIKAN1");
    root.ele("SIKIN_KIKAN2");
    root.ele("SIKIN_KIKAN_FUKUSU");
  }
}

function serializeDietMemberRelation(
  root: XMLBuilder,
  details: OrganizationReportProfileDetails,
): void {
  const dietMemberRelation = details.dietMemberRelation;
  const type = dietMemberRelation?.type ?? "0";

  root.ele("GIIN_DANTAI_KBN").txt(type);

  if (type !== "0" && dietMemberRelation) {
    // 仕様: GIIN1_KOSYOKU_NM_1, GIIN2_KOSYOKU_NM_1, GIIN3_KOSYOKU_NM_1 (1始まり)
    const members = dietMemberRelation.members ?? [];
    for (let i = 0; i < 3; i++) {
      const member = members[i];
      const suffix = (i + 1).toString();

      root.ele(`GIIN${suffix}_KOSYOKU_NM_1`).txt(member?.lastName ?? "");
      root.ele(`GIIN${suffix}_KOSYOKU_NM_2`).txt(member?.firstName ?? "");
      root.ele(`GIIN${suffix}_KOSYOKU_NM`).txt(member?.chamber ?? "");
      root.ele(`GIIN${suffix}_KOSYOKU_KBN`).txt(member?.positionType ?? "");
    }

    // 仕様: 1件目は GIIN_KIKAN1, GIIN_KIKAN2
    //       2件目以降は GIIN_KIKAN_FUKUSU にカンマ区切りで出力
    const periods = dietMemberRelation.periods ?? [];
    if (periods.length > 0) {
      root.ele("GIIN_KIKAN1").txt(periods[0]?.from ?? "");
      root.ele("GIIN_KIKAN2").txt(periods[0]?.to ?? "");
    } else {
      root.ele("GIIN_KIKAN1");
      root.ele("GIIN_KIKAN2");
    }

    // 2件目以降をカンマ区切りで GIIN_KIKAN_FUKUSU に出力
    if (periods.length > 1) {
      const fukusuPeriods = periods
        .slice(1)
        .map((p) => `${p.from}～${p.to}`)
        .join(",");
      root.ele("GIIN_KIKAN_FUKUSU").txt(fukusuPeriods);
    } else {
      root.ele("GIIN_KIKAN_FUKUSU");
    }
  } else {
    // データなしの場合も全タグを出力
    for (let i = 0; i < 3; i++) {
      const suffix = (i + 1).toString();
      root.ele(`GIIN${suffix}_KOSYOKU_NM_1`);
      root.ele(`GIIN${suffix}_KOSYOKU_NM_2`);
      root.ele(`GIIN${suffix}_KOSYOKU_NM`);
      root.ele(`GIIN${suffix}_KOSYOKU_KBN`);
    }
    root.ele("GIIN_KIKAN1");
    root.ele("GIIN_KIKAN2");
    root.ele("GIIN_KIKAN_FUKUSU");
  }
}
