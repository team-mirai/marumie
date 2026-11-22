import "server-only";

import type { DonorCsvRecord } from "@/server/contexts/report/domain/models/donor-csv-record";
import type { PreviewDonorCsvRow } from "@/server/contexts/report/domain/models/preview-donor-csv-row";
import { normalizeDonorInput, parseDonorType } from "@/server/contexts/report/domain/models/donor";
import type { IDonorCsvRecordConverter } from "@/server/contexts/report/domain/repositories/donor-csv-record-converter.interface";

export class DonorCsvRecordConverter implements IDonorCsvRecordConverter {
  convert(record: DonorCsvRecord): PreviewDonorCsvRow {
    const donorInput = normalizeDonorInput({
      donorType: parseDonorType(record.donorType),
      name: record.name,
      address: record.address,
      occupation: record.occupation,
    });

    return {
      rowNumber: record.rowNumber,
      transactionNo: record.transaction_no.trim(),
      ...donorInput,
      status: "valid",
      errors: [],
      transaction: null,
      matchingDonor: null,
    };
  }
}
