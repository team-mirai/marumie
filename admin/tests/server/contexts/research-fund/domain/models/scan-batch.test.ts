import {
  SCAN_BATCH_MAX_DOCUMENTS,
  summarizeScanBatch,
  validateScanUpload,
  type ScanJobStatus,
  type ScanJobView,
} from "@/server/contexts/research-fund/domain/models/scan-batch";

function job(status: ScanJobStatus): ScanJobView {
  return { id: "1", status, originalFilename: "a.jpg", mime: "image/jpeg", summary: null, error: null };
}

describe("validateScanUpload", () => {
  it("accepts 1 to 30 supported documents", () => {
    for (const count of [1, SCAN_BATCH_MAX_DOCUMENTS]) {
      const documents = Array.from({ length: count }, () => ({ mime: "image/jpeg" }));
      expect(validateScanUpload(documents)).toEqual({ status: "valid", value: undefined });
    }
    expect(
      validateScanUpload([{ mime: "image/png" }, { mime: "application/pdf" }]),
    ).toMatchObject({ status: "valid" });
  });
  it("rejects an empty selection", () => {
    expect(validateScanUpload([])).toMatchObject({
      status: "invalid",
      errors: [{ code: "RF_INVALID_DOCUMENT", message: "書類を1枚以上選んでください" }],
    });
  });
  it("rejects more than 30 documents", () => {
    const documents = Array.from({ length: SCAN_BATCH_MAX_DOCUMENTS + 1 }, () => ({
      mime: "image/jpeg",
    }));
    expect(validateScanUpload(documents)).toMatchObject({
      status: "invalid",
      errors: [{ message: "1回にアップロードできるのは30枚までです" }],
    });
  });
  it.each(["image/gif", "text/csv", "", "image/svg+xml"])("rejects %s", (mime) => {
    expect(validateScanUpload([{ mime: "image/jpeg" }, { mime }])).toMatchObject({
      status: "invalid",
      errors: [{ message: "JPG・PNG・PDFのみアップロードできます" }],
    });
  });
});

describe("summarizeScanBatch", () => {
  it("counts finished jobs and rounds the progress", () => {
    expect(
      summarizeScanBatch([
        job("succeeded"),
        job("succeeded"),
        job("failed"),
        job("running"),
        job("queued"),
        job("queued"),
      ]),
    ).toEqual({ total: 6, succeeded: 2, failed: 1, percent: 50 });
  });
  it("reports 0% while every job is still queued", () => {
    expect(summarizeScanBatch([job("queued"), job("queued")])).toEqual({
      total: 2,
      succeeded: 0,
      failed: 0,
      percent: 0,
    });
  });
  it("does not divide by zero for an empty batch", () => {
    expect(summarizeScanBatch([])).toEqual({ total: 0, succeeded: 0, failed: 0, percent: 0 });
  });
});
