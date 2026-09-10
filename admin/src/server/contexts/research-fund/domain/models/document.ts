import {
  invalidResearchFundResult,
  RF_ERROR_CODES,
  type ResearchFundResult,
} from "@/server/contexts/research-fund/domain/types/validation";

export interface ResearchFundDocument {
  id: string;
  bookId: string;
  storageKey: string;
  mime: string;
  originalFilename: string;
  createdAt: Date;
}

export const ResearchFundDocument = {
  validateFile(bytes: Uint8Array, mime: string): ResearchFundResult<undefined> {
    if (!bytes.length || !["image/jpeg", "image/png", "application/pdf"].includes(mime)) {
      return invalidResearchFundResult(
        "document",
        RF_ERROR_CODES.INVALID_DOCUMENT,
        "JPEG・PNG・PDFの空でない書類を指定してください",
      );
    }
    return { status: "valid", value: undefined };
  },
  validateFilename(filename: string): ResearchFundResult<undefined> {
    if (!filename.trim() || [...filename].length > 255) {
      return invalidResearchFundResult(
        "originalFilename",
        RF_ERROR_CODES.INVALID_DOCUMENT,
        "元ファイル名は1〜255文字で指定してください",
      );
    }
    return { status: "valid", value: undefined };
  },
  validateId(id: string): ResearchFundResult<undefined> {
    if (!/^[1-9]\d{0,18}$/.test(id) || BigInt(id) > BigInt("9223372036854775807")) {
      return invalidResearchFundResult(
        "id",
        RF_ERROR_CODES.INVALID_DOCUMENT,
        "有効なIDを指定してください",
      );
    }
    return { status: "valid", value: undefined };
  },
  validateExpiry(expiresIn: number): ResearchFundResult<undefined> {
    if (!Number.isInteger(expiresIn) || expiresIn < 1 || expiresIn > 604800) {
      return invalidResearchFundResult(
        "expiresIn",
        RF_ERROR_CODES.INVALID_DOCUMENT,
        "署名URLの有効期限は1〜604800秒で指定してください",
      );
    }
    return { status: "valid", value: undefined };
  },
};
