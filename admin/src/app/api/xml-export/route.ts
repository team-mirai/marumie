import { NextResponse } from "next/server";
import * as iconv from "iconv-lite";
import { prisma } from "@/server/lib/prisma";
import { PrismaTransactionXmlRepository } from "@/server/repositories/prisma-transaction-xml.repository";
import {
  XmlExportUsecase,
  type XmlSectionType,
} from "@/server/usecases/xml-export-usecase";

const VALID_SECTIONS: XmlSectionType[] = ["other-income"];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const politicalOrganizationId = url.searchParams.get(
    "politicalOrganizationId",
  );
  const financialYearRaw = url.searchParams.get("financialYear");
  const sectionRaw = url.searchParams.get("section") || "other-income";

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

  if (!Number.isFinite(financialYear)) {
    return NextResponse.json(
      { error: "financialYear must be a valid number" },
      { status: 400 },
    );
  }

  if (!VALID_SECTIONS.includes(sectionRaw as XmlSectionType)) {
    return NextResponse.json(
      { error: `Unsupported section: ${sectionRaw}` },
      { status: 400 },
    );
  }

  const section = sectionRaw as XmlSectionType;

  try {
    const repository = new PrismaTransactionXmlRepository(prisma);
    const usecase = new XmlExportUsecase(repository);

    const result = await usecase.execute({
      politicalOrganizationId,
      financialYear,
      section,
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
