import type { PreviewDonorCsvRow } from "@/server/contexts/report/domain/models/preview-donor-csv-row";
import type { PreviewDonorCsvSummary } from "@/server/contexts/report/domain/services/donor-csv-summary-calculator";

export interface PreviewDonorCsvResult {
  rows: PreviewDonorCsvRow[];
  summary: PreviewDonorCsvSummary;
}
