import {
  ScanJob,
  SCAN_JOB_BATCH_SIZE,
  SCAN_JOB_STALE_MS,
} from "@/server/contexts/research-fund/domain/models/scan-job";

describe("ScanJob", () => {
  describe("claimableCount", () => {
    it("claims a small batch when nothing is running", () => {
      expect(ScanJob.claimableCount(0)).toBe(SCAN_JOB_BATCH_SIZE);
    });

    it("claims nothing while the running limit is reached", () => {
      expect(ScanJob.claimableCount(SCAN_JOB_BATCH_SIZE)).toBe(0);
      expect(ScanJob.claimableCount(SCAN_JOB_BATCH_SIZE + 5)).toBe(0);
    });

    it("claims only the remaining slots", () => {
      expect(ScanJob.claimableCount(SCAN_JOB_BATCH_SIZE - 1)).toBe(1);
    });
  });

  describe("staleBefore", () => {
    it("marks jobs that started more than the limit ago as abandoned", () => {
      const now = new Date("2026-09-12T10:00:00.000Z");
      expect(ScanJob.staleBefore(now)).toEqual(new Date(now.getTime() - SCAN_JOB_STALE_MS));
    });
  });

  describe("canTransition", () => {
    it.each([
      ["queued", "running"],
      ["running", "succeeded"],
      ["running", "failed"],
      ["running", "queued"],
      ["failed", "queued"],
    ] as const)("allows %s → %s", (from, to) => {
      expect(ScanJob.canTransition(from, to)).toBe(true);
    });

    it.each([
      ["queued", "succeeded"],
      ["queued", "failed"],
      ["succeeded", "queued"],
      ["succeeded", "failed"],
      ["failed", "running"],
      ["failed", "succeeded"],
    ] as const)("forbids %s → %s", (from, to) => {
      expect(ScanJob.canTransition(from, to)).toBe(false);
    });
  });

  describe("retry", () => {
    it("allows retrying a failed job", () => {
      expect(ScanJob.retry("failed")).toEqual({ status: "valid", value: "failed" });
    });

    it.each(["queued", "running", "succeeded", null] as const)(
      "rejects retrying a %s job with the message shown on screen",
      (status) => {
        const result = ScanJob.retry(status);
        expect(result.status).toBe("invalid");
        if (result.status !== "invalid") return;
        expect(result.errors[0].message).toBe(
          "このジョブは再実行できません。画面を再読み込みしてください",
        );
      },
    );
  });

  describe("isReread", () => {
    it("treats a job with a reread instruction as a reread", () => {
      expect(ScanJob.isReread({ rereadInstruction: "日付を読み直して" })).toBe(true);
    });

    it("treats a job without an instruction as a normal scan", () => {
      expect(ScanJob.isReread({ rereadInstruction: null })).toBe(false);
    });
  });
});
