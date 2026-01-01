import type {
  PreviewDonorCsvRow,
  TransactionForDonorCsv,
} from "@/server/contexts/report/domain/models/preview-donor-csv-row";
import {
  MAX_NAME_LENGTH,
  MAX_ADDRESS_LENGTH,
  MAX_OCCUPATION_LENGTH,
  DONOR_TYPE_LABELS,
} from "@/server/contexts/report/domain/models/donor";
import { isDonorTypeAllowedForCategory } from "@/server/contexts/report/domain/models/donor-assignment-rules";

export class DonorCsvValidator {
  validate(
    rows: PreviewDonorCsvRow[],
    transactionMap: Map<string, TransactionForDonorCsv>,
  ): PreviewDonorCsvRow[] {
    const duplicateMap = this.buildDuplicateMap(rows);

    return rows.map((row) => this.validateRow(row, transactionMap, duplicateMap));
  }

  private buildDuplicateMap(rows: PreviewDonorCsvRow[]): Map<string, number[]> {
    const transactionNoToRows = new Map<string, number[]>();

    for (const row of rows) {
      if (!row.transactionNo) continue;
      const existing = transactionNoToRows.get(row.transactionNo) ?? [];
      existing.push(row.rowNumber);
      transactionNoToRows.set(row.transactionNo, existing);
    }

    const duplicateMap = new Map<string, number[]>();
    for (const [transactionNo, rowNumbers] of transactionNoToRows) {
      if (rowNumbers.length > 1) {
        duplicateMap.set(transactionNo, rowNumbers);
      }
    }
    return duplicateMap;
  }

  private validateRow(
    row: PreviewDonorCsvRow,
    transactionMap: Map<string, TransactionForDonorCsv>,
    duplicateMap: Map<string, number[]>,
  ): PreviewDonorCsvRow {
    const duplicateRows = duplicateMap.get(row.transactionNo);
    if (duplicateRows) {
      return {
        ...row,
        status: "invalid",
        errors: [
          `取引No '${row.transactionNo}' が重複しています（行 ${duplicateRows.join(", ")}）`,
        ],
      };
    }

    const inputErrors = this.validateInputValues(row);
    if (inputErrors.length > 0) {
      return { ...row, status: "invalid", errors: inputErrors };
    }

    const transaction = transactionMap.get(row.transactionNo);
    if (!transaction) {
      return {
        ...row,
        status: "transaction_not_found",
        errors: [`取引No '${row.transactionNo}' が見つかりません`],
      };
    }

    const donorType = row.donorType;
    if (donorType === null) {
      return { ...row, status: "invalid", errors: ["寄付者種別は必須です"] };
    }

    if (!isDonorTypeAllowedForCategory(transaction.categoryKey, donorType)) {
      return {
        ...row,
        status: "type_mismatch",
        errors: [
          `カテゴリ '${transaction.friendlyCategory || transaction.categoryKey}' に対して` +
            `寄付者種別 '${DONOR_TYPE_LABELS[donorType]}' は指定できません`,
        ],
        transaction: this.mapTransaction(transaction),
      };
    }

    return {
      ...row,
      status: "valid",
      errors: [],
      transaction: this.mapTransaction(transaction),
    };
  }

  private validateInputValues(row: PreviewDonorCsvRow): string[] {
    const errors: string[] = [];

    if (!row.transactionNo) {
      errors.push("取引Noは必須です");
    }

    if (!row.name) {
      errors.push("寄付者名は必須です");
    } else if (row.name.length > MAX_NAME_LENGTH) {
      errors.push(`寄付者名は${MAX_NAME_LENGTH}文字以内で入力してください`);
    }

    if (row.donorType === null) {
      errors.push("寄付者種別は必須です");
    }

    if (row.address && row.address.length > MAX_ADDRESS_LENGTH) {
      errors.push(`住所は${MAX_ADDRESS_LENGTH}文字以内で入力してください`);
    }

    if (row.occupation && row.occupation.length > MAX_OCCUPATION_LENGTH) {
      errors.push(`職業は${MAX_OCCUPATION_LENGTH}文字以内で入力してください`);
    }

    if (row.donorType === "individual") {
      if (!row.occupation) {
        errors.push("個人の寄付者の場合、職業は必須です");
      }
    } else if (row.donorType !== null && row.occupation) {
      errors.push("法人・政治団体の場合、職業は指定できません");
    }

    return errors;
  }

  private mapTransaction(transaction: TransactionForDonorCsv): PreviewDonorCsvRow["transaction"] {
    return {
      id: transaction.id,
      transactionDate: transaction.transactionDate,
      categoryKey: transaction.categoryKey,
      friendlyCategory: transaction.friendlyCategory,
      debitAmount: transaction.debitAmount,
      creditAmount: transaction.creditAmount,
      debitPartner: transaction.debitPartner,
      creditPartner: transaction.creditPartner,
      existingDonor: transaction.existingDonor,
    };
  }
}
