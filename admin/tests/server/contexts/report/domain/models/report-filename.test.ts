import { buildReportFilename } from "@/server/contexts/report/domain/models/report-filename";

describe("buildReportFilename", () => {
  it("年度・スラッグ・出力日時から report_{年度}_{スラッグ}_{YYYYMMDD_HHMM}.xml を組み立てる", () => {
    const filename = buildReportFilename(2025, "team-mirai", new Date(2026, 9, 6, 14, 30));

    expect(filename).toBe("report_2025_team-mirai_20261006_1430.xml");
  });

  it("スラッグが無いときは unknown を使う", () => {
    const filename = buildReportFilename(2025, null, new Date(2026, 9, 6, 14, 30));

    expect(filename).toBe("report_2025_unknown_20261006_1430.xml");
  });

  it("1 桁の月・日・時・分を 0 埋めする", () => {
    const filename = buildReportFilename(2024, "org", new Date(2025, 0, 2, 3, 4));

    expect(filename).toBe("report_2024_org_20250102_0304.xml");
  });
});
