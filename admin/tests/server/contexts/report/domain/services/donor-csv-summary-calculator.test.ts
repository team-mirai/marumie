import { calculateDonorPreviewSummary } from "@/server/contexts/report/domain/services/donor-csv-summary-calculator";
import type { PreviewDonorCsvRow } from "@/server/contexts/report/domain/models/preview-donor-csv-row";

describe("calculateDonorPreviewSummary", () => {
  const createMockRow = (
    status: PreviewDonorCsvRow["status"],
    rowNumber: number = 1,
  ): PreviewDonorCsvRow => ({
    rowNumber,
    transactionNo: `T2025-000${rowNumber}`,
    name: "テスト太郎",
    donorType: "individual",
    address: "東京都渋谷区",
    occupation: "会社員",
    status,
    errors: [],
    transaction: null,
    matchingDonor: null,
  });

  it("should return all zeros for empty array", () => {
    const result = calculateDonorPreviewSummary([]);

    expect(result.total).toBe(0);
    expect(result.valid).toBe(0);
    expect(result.invalid).toBe(0);
    expect(result.transactionNotFound).toBe(0);
    expect(result.typeMismatch).toBe(0);
  });

  it("should count valid rows correctly", () => {
    const rows = [
      createMockRow("valid", 1),
      createMockRow("valid", 2),
      createMockRow("valid", 3),
    ];

    const result = calculateDonorPreviewSummary(rows);

    expect(result.total).toBe(3);
    expect(result.valid).toBe(3);
    expect(result.invalid).toBe(0);
    expect(result.transactionNotFound).toBe(0);
    expect(result.typeMismatch).toBe(0);
  });

  it("should count invalid rows correctly", () => {
    const rows = [
      createMockRow("invalid", 1),
      createMockRow("invalid", 2),
    ];

    const result = calculateDonorPreviewSummary(rows);

    expect(result.total).toBe(2);
    expect(result.valid).toBe(0);
    expect(result.invalid).toBe(2);
    expect(result.transactionNotFound).toBe(0);
    expect(result.typeMismatch).toBe(0);
  });

  it("should count transaction_not_found rows correctly", () => {
    const rows = [
      createMockRow("transaction_not_found", 1),
      createMockRow("transaction_not_found", 2),
    ];

    const result = calculateDonorPreviewSummary(rows);

    expect(result.total).toBe(2);
    expect(result.valid).toBe(0);
    expect(result.invalid).toBe(0);
    expect(result.transactionNotFound).toBe(2);
    expect(result.typeMismatch).toBe(0);
  });

  it("should count type_mismatch rows correctly", () => {
    const rows = [
      createMockRow("type_mismatch", 1),
    ];

    const result = calculateDonorPreviewSummary(rows);

    expect(result.total).toBe(1);
    expect(result.valid).toBe(0);
    expect(result.invalid).toBe(0);
    expect(result.transactionNotFound).toBe(0);
    expect(result.typeMismatch).toBe(1);
  });

  it("should count mixed status rows correctly", () => {
    const rows = [
      createMockRow("valid", 1),
      createMockRow("valid", 2),
      createMockRow("invalid", 3),
      createMockRow("transaction_not_found", 4),
      createMockRow("type_mismatch", 5),
      createMockRow("type_mismatch", 6),
    ];

    const result = calculateDonorPreviewSummary(rows);

    expect(result.total).toBe(6);
    expect(result.valid).toBe(2);
    expect(result.invalid).toBe(1);
    expect(result.transactionNotFound).toBe(1);
    expect(result.typeMismatch).toBe(2);
  });
});
