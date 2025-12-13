import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaTransactionRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-transaction.repository";
import { GetTransactionsUsecase } from "@/server/contexts/data-import/application/usecases/get-transactions-usecase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const page = parseInt(searchParams.get("page") || "1", 10);
    const perPage = parseInt(searchParams.get("perPage") || "50", 10);
    const orgIds = searchParams.get("orgIds");
    const transactionType = searchParams.get("transactionType") as
      | "income"
      | "expense"
      | undefined;
    const dateFromParam = searchParams.get("dateFrom");
    const dateFrom = dateFromParam ? new Date(dateFromParam) : undefined;
    const dateToParam = searchParams.get("dateTo");
    const dateTo = dateToParam ? new Date(dateToParam) : undefined;
    const financialYearParam = searchParams.get("financialYear");
    const financialYear = financialYearParam
      ? parseInt(financialYearParam, 10)
      : undefined;

    // Parse org IDs array from comma-separated string
    const politicalOrganizationIds = orgIds
      ? orgIds.split(",").filter((id) => id.trim())
      : undefined;

    const repository = new PrismaTransactionRepository(prisma);
    const usecase = new GetTransactionsUsecase(repository);

    const result = await usecase.execute({
      page,
      perPage,
      politicalOrganizationIds,
      transactionType,
      dateFrom,
      dateTo,
      financialYear,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 },
    );
  }
}
