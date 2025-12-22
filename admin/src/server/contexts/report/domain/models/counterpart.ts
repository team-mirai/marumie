export interface Counterpart {
  id: string;
  name: string;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CounterpartWithUsage extends Counterpart {
  usageCount: number;
}

export interface CreateCounterpartInput {
  name: string;
  address: string | null;
}

export interface UpdateCounterpartInput {
  name?: string;
  address?: string | null;
}

export const MAX_NAME_LENGTH = 120;
export const MAX_ADDRESS_LENGTH = 120;

export function validateCounterpartInput(input: CreateCounterpartInput): string[] {
  const errors: string[] = [];
  const trimmedName = input.name?.trim() ?? "";
  const trimmedAddress = input.address?.trim() ?? "";

  if (trimmedName.length === 0) {
    errors.push("名前は必須です");
  } else if (trimmedName.length > MAX_NAME_LENGTH) {
    errors.push(`名前は${MAX_NAME_LENGTH}文字以内で入力してください`);
  }

  if (trimmedAddress.length > MAX_ADDRESS_LENGTH) {
    errors.push(`住所は${MAX_ADDRESS_LENGTH}文字以内で入力してください`);
  }

  return errors;
}
