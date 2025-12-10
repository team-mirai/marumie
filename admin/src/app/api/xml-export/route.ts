import { NextResponse } from "next/server";
import * as iconv from "iconv-lite";
import { prisma } from "@/server/lib/prisma";
import { PrismaTransactionXmlRepository } from "@/server/repositories/prisma-transaction-xml.repository";
import {
  XmlExportUsecase,
  type XmlSectionType,
} from "@/server/usecases/xml-export-usecase";

const VALID_SECTIONS: XmlSectionType[] = ["SYUUSHI07_06"];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const politicalOrganizationId = url.searchParams.get(
    "politicalOrganizationId",
  );
  const financialYearRaw = url.searchParams.get("financialYear");
  // Accept sections as comma-separated string (e.g., "SYUUSHI07_06,SYUUSHI07_07")
  const sectionsRaw = url.searchParams.get("sections") || "SYUUSHI07_06";

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

  // Validate that politicalOrganizationId can be converted to BigInt
  try {
    BigInt(politicalOrganizationId);
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

  // Parse and validate sections
  const sections = sectionsRaw.split(",").map((s) => s.trim());
  const invalidSections = sections.filter(
    (s) => !VALID_SECTIONS.includes(s as XmlSectionType),
  );

  if (invalidSections.length > 0) {
    return NextResponse.json(
      { error: `Unsupported sections: ${invalidSections.join(", ")}` },
      { status: 400 },
    );
  }

  const validatedSections = sections as XmlSectionType[];

  try {
    const repository = new PrismaTransactionXmlRepository(prisma);
    const usecase = new XmlExportUsecase(repository);

    const result = await usecase.execute({
      politicalOrganizationId,
      financialYear,
      sections: validatedSections,
    });

    const shiftJisBuffer = iconv.encode(result.xml, "shift_jis");

    return new NextResponse(Uint8Array.from(shiftJisBuffer), {
      headers: {
        "Content-Type": "application/xml; charset=Shift_JIS",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
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
