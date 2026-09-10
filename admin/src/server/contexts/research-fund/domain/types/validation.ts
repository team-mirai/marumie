export const RF_ERROR_CODES = {
  INVALID_AMOUNT: "RF_INVALID_AMOUNT",
  INVALID_ACCOUNT: "RF_INVALID_ACCOUNT",
  INVALID_PATTERN: "RF_INVALID_PATTERN",
  INVALID_LINES: "RF_INVALID_LINES",
  UNBALANCED_POSTING: "RF_UNBALANCED_POSTING",
  INVALID_STATUS_TRANSITION: "RF_INVALID_STATUS_TRANSITION",
  INVALID_DATE: "RF_INVALID_DATE",
  INVALID_DESCRIPTION: "RF_INVALID_DESCRIPTION",
  INVALID_DOCUMENT: "RF_INVALID_DOCUMENT",
  DOCUMENT_NOT_FOUND: "RF_DOCUMENT_NOT_FOUND",
  INVALID_EXTRACTION_OUTPUT: "RF_INVALID_EXTRACTION_OUTPUT",
  EXTRACTION_FAILED: "RF_EXTRACTION_FAILED",
} as const;

export interface ResearchFundValidationError {
  path: string;
  code: (typeof RF_ERROR_CODES)[keyof typeof RF_ERROR_CODES];
  message: string;
  severity: "error" | "warning";
}

export type ResearchFundResult<T> =
  | { status: "valid"; value: T }
  | { status: "invalid"; errors: ResearchFundValidationError[] };

export function invalidResearchFundResult(
  path: string,
  code: ResearchFundValidationError["code"],
  message: string,
): ResearchFundResult<never> {
  return { status: "invalid", errors: [{ path, code, message, severity: "error" }] };
}
