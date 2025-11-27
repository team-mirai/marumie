import { NextResponse } from "next/server";
import * as iconv from "iconv-lite";
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

  if (!Number.isFinite(financialYear)) {
    return NextResponse.json(
      { error: "financialYear must be a valid number" },
      { status: 400 },
    );
  }

  try {
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
    const filename = `SYUUSHI07_06_${politicalOrganizationId}_${financialYear}.xml`;

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
