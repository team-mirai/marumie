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
});
