import { NextResponse } from "next/server";
import * as iconv from "iconv-lite";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaReportTransactionRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-report-transaction.repository";
import { PrismaOrganizationReportProfileRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-organization-report-profile.repository";
import { XmlExportUsecase } from "@/server/contexts/report/application/usecases/xml-export-usecase";
import { DonationAssembler } from "@/server/contexts/report/application/services/donation-assembler";
import { ExpenseAssembler } from "@/server/contexts/report/application/services/expense-assembler";
import { IncomeAssembler } from "@/server/contexts/report/application/services/income-assembler";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const politicalOrganizationId = url.searchParams.get(
    "politicalOrganizationId",
  );
  const financialYearRaw = url.searchParams.get("financialYear");

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

  try {
    const transactionRepository = new PrismaReportTransactionRepository(prisma);
    const profileRepository = new PrismaOrganizationReportProfileRepository(
      prisma,
    );
    const donationAssembler = new DonationAssembler(transactionRepository);
    const incomeAssembler = new IncomeAssembler(transactionRepository);
    const expenseAssembler = new ExpenseAssembler(transactionRepository);
    const usecase = new XmlExportUsecase(
      profileRepository,
      donationAssembler,
      incomeAssembler,
      expenseAssembler,
    );

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
