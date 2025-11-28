import { NextResponse } from "next/server";
import * as iconv from "iconv-lite";
import { prisma } from "@/server/lib/prisma";
import { buildXmlDocument } from "@/server/xml/document-builder";
import {
  buildOtherIncomeSection,
  serializeOtherIncomeSection,
} from "@/server/xml/sections/syuushi07_06__other_income";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const politicalOrganizationId = url.searchParams.get(
    "politicalOrganizationId",
  );
  const financialYearRaw = url.searchParams.get("financialYear");
  const mode = url.searchParams.get("mode");

  if (!politicalOrganizationId) {
    return NextResponse.json(
      { error: "politicalOrganizationId is required" },
      { status: 400 },
    );
  }

  if (!financialYearRaw) {
    return NextResponse.json(
      { error: "financialYear is required" },
      { status: 400 },
    );
  }

  const financialYear = Number.parseInt(financialYearRaw, 10);
  let politicalOrganizationIdBigInt: bigint;

  try {
    politicalOrganizationIdBigInt = BigInt(politicalOrganizationId);
  } catch {
    return NextResponse.json(
      { error: "politicalOrganizationId must be a valid number" },
      { status: 400 },
    );
  }

  if (!Number.isFinite(financialYear)) {
    return NextResponse.json(
      { error: "financialYear must be a valid number" },
      { status: 400 },
    );
  }

  try {
    const organization = await prisma.politicalOrganization.findUnique({
      where: { id: politicalOrganizationIdBigInt },
      select: { displayName: true, orgName: true },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Political organization not found" },
        { status: 404 },
      );
    }

    const section = await buildOtherIncomeSection({
      politicalOrganizationId,
      financialYear,
    });

    const sectionXml = serializeOtherIncomeSection(section);
    const document = buildXmlDocument({
      sections: [sectionXml],
    });

    if (mode === "preview") {
      return NextResponse.json({ xml: document });
    }

    const shiftJisBuffer = iconv.encode(document, "shift_jis");
    const shiftJisBytes = Uint8Array.from(shiftJisBuffer);
    const organizationName =
      organization.orgName?.trim() || organization.displayName?.trim();
    const safeOrganizationSegment = sanitizeForFilename(
      organizationName || politicalOrganizationId,
    );
    const timestamp = formatTimestamp(new Date());
    const filename = `marumie_sml_${safeOrganizationSegment}__${timestamp}.xml`;

    return new NextResponse(shiftJisBytes, {
      headers: {
        "Content-Type": "application/xml; charset=Shift_JIS",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Failed to generate XML:", error);
    return NextResponse.json(
      { error: "Failed to generate XML" },
      { status: 500 },
    );
  }
}

function formatTimestamp(date: Date) {
  const pad = (value: number) => value.toString().padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${year}${month}${day}_${hours}${minutes}`;
}

function sanitizeForFilename(input: string) {
  return (
    input
      .normalize("NFKC")
      .replace(/[\s\\/:"*?<>|]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 50) || "organization"
  );
}
