import { NextResponse } from "next/server";
import { GenerateOtherIncomeXmlUsecase } from "@/server/usecases/generate-other-income-xml-usecase";

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

  if (!Number.isFinite(financialYear)) {
    return NextResponse.json(
      { error: "financialYear must be a valid number" },
      { status: 400 },
    );
  }

  try {
    const usecase = new GenerateOtherIncomeXmlUsecase();
    const result = await usecase.execute({
      politicalOrganizationId,
      financialYear,
    });

    if (mode === "preview") {
      return NextResponse.json({ xml: result.xml });
    }

    return new NextResponse(Uint8Array.from(result.shiftJisBuffer), {
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
