import { buildSyncExportFilename } from "@/server/contexts/shared/domain/models/organization-sync-export";

describe("buildSyncExportFilename", () => {
  it("団体slugとUTCの書き出し日時を含むファイル名にする", () => {
    expect(buildSyncExportFilename("team-mirai", new Date("2026-09-18T01:23:45.678Z"))).toBe(
      "marumie-sync_team-mirai_20260918T012345.json",
    );
  });

  it("Content-Disposition に載せられない文字は落とす", () => {
    expect(buildSyncExportFilename('a"b/c', new Date("2026-09-18T00:00:00.000Z"))).toBe(
      "marumie-sync_a_b_c_20260918T000000.json",
    );
  });
});
