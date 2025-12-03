import { NextResponse } from "next/server";
import * as iconv from "iconv-lite";
import { prisma } from "@/server/lib/prisma";
import { PrismaTransactionRepository } from "@/server/repositories/prisma-transaction.repository";
import { GenerateOtherIncomeXmlUsecase } from "@/server/usecases/generate-other-income-xml-usecase";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const politicalOrganizationId = url.searchParams.get(
    "politicalOrganizationId",
  );
  const financialYearRaw = url.searchParams.get("financialYear");
  const section = url.searchParams.get("section");

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

  try {
    // Currently only supports "other-income" section
    if (section && section !== "other-income") {
      return NextResponse.json(
        { error: `Unsupported section: ${section}` },
        { status: 400 },
      );
    }

    const repository = new PrismaTransactionRepository(prisma);
    const usecase = new GenerateOtherIncomeXmlUsecase(repository);

    const result = await usecase.execute({
      politicalOrganizationId,
      financialYear,
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
