import "server-only";

import type { DonorCsvRecord } from "./donor-csv-record";
import type { PreviewDonorCsvRow } from "@/server/contexts/report/domain/models/preview-donor-csv-row";
import { parseDonorType } from "@/server/contexts/report/domain/models/donor";

export interface IDonorCsvRecordConverter {
  convert(record: DonorCsvRecord): PreviewDonorCsvRow;
}

export class DonorCsvRecordConverter implements IDonorCsvRecordConverter {
  convert(record: DonorCsvRecord): PreviewDonorCsvRow {
    const trimmedName = record.name.trim();
    const trimmedAddress = record.address.trim() || null;
    const trimmedOccupation = record.occupation.trim() || null;

    const donorType = parseDonorType(record.donorType);

    return {
      rowNumber: record.rowNumber,
      transactionNo: record.transaction_no.trim(),
      name: trimmedName,
      donorType,
      address: trimmedAddress,
      occupation: trimmedOccupation,
      status: "valid",
      errors: [],
      transaction: null,
      matchingDonor: null,
    };
  }
}
