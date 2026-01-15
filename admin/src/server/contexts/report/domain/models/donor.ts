export type DonorType = "individual" | "corporation" | "political_organization";

export interface Donor {
  id: string;
  donorType: DonorType;
  name: string;
  address: string | null;
  occupation: string | null;
  tenantId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DonorWithUsage extends Donor {
  usageCount: number;
}

export interface CreateDonorInput {
  donorType: DonorType;
  name: string;
  address: string | null;
  occupation: string | null;
  tenantId: bigint;
}

export interface UpdateDonorInput {
  donorType?: DonorType;
  name?: string;
  address?: string | null;
  occupation?: string | null;
}

export const MAX_NAME_LENGTH = 120;
export const MAX_ADDRESS_LENGTH = 120;
export const MAX_OCCUPATION_LENGTH = 50;

export const DONOR_TYPE_LABELS: Record<DonorType, string> = {
  individual: "個人",
  corporation: "法人",
  political_organization: "政治団体",
};

/**
 * 有効な DonorType の一覧
 * DONOR_TYPE_LABELS のキーから自動生成されるため、型定義と常に同期される
 */
export const VALID_DONOR_TYPES = Object.keys(DONOR_TYPE_LABELS) as DonorType[];

/**
 * 文字列が有効な DonorType かどうかを判定する
 * @param value 判定対象の文字列
 * @returns 有効な DonorType の場合は true
 */
function isValidDonorType(value: string): value is DonorType {
  return VALID_DONOR_TYPES.includes(value as DonorType);
}

/**
 * 文字列を DonorType にパースする
 * @param value パース対象の文字列
 * @returns 有効な DonorType の場合はその値、無効な場合は null
 */
export function parseDonorType(value: string): DonorType | null {
  const normalized = value.trim().toLowerCase();
  return isValidDonorType(normalized) ? normalized : null;
}

export interface ValidateDonorInput {
  donorType: DonorType;
  name: string;
  address: string | null;
  occupation: string | null;
}

export function validateDonorInput(input: ValidateDonorInput): string[] {
  const errors: string[] = [];
  const trimmedName = input.name?.trim() ?? "";
  const trimmedAddress = input.address?.trim() ?? "";
  const trimmedOccupation = input.occupation?.trim() ?? "";

  if (trimmedName.length === 0) {
    errors.push("名前は必須です");
  } else if (trimmedName.length > MAX_NAME_LENGTH) {
    errors.push(`名前は${MAX_NAME_LENGTH}文字以内で入力してください`);
  }

  if (trimmedAddress.length > MAX_ADDRESS_LENGTH) {
    errors.push(`住所は${MAX_ADDRESS_LENGTH}文字以内で入力してください`);
  }

  if (input.donorType === "individual") {
    if (trimmedOccupation.length === 0) {
      errors.push("個人の場合、職業は必須です");
    } else if (trimmedOccupation.length > MAX_OCCUPATION_LENGTH) {
      errors.push(`職業は${MAX_OCCUPATION_LENGTH}文字以内で入力してください`);
    }
  } else if (trimmedOccupation.length > 0) {
    errors.push("職業は個人の場合のみ入力できます");
  }

  if (!isValidDonorType(input.donorType)) {
    errors.push("無効な寄付者種別です");
  }

  return errors;
}
