export interface Counterpart {
  id: string;
  name: string;
  address: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CounterpartWithUsage extends Counterpart {
  usageCount: number;
}

export interface CreateCounterpartInput {
  name: string;
  address: string;
}

export interface UpdateCounterpartInput {
  name?: string;
  address?: string;
}

export const MAX_NAME_LENGTH = 120;
export const MAX_ADDRESS_LENGTH = 120;

export function validateCounterpartInput(input: CreateCounterpartInput): string[] {
  const errors: string[] = [];

  if (!input.name || input.name.trim().length === 0) {
    errors.push("名前は必須です");
  } else if (input.name.length > MAX_NAME_LENGTH) {
    errors.push(`名前は${MAX_NAME_LENGTH}文字以内で入力してください`);
  }

  if (!input.address || input.address.trim().length === 0) {
    errors.push("住所は必須です");
  } else if (input.address.length > MAX_ADDRESS_LENGTH) {
    errors.push(`住所は${MAX_ADDRESS_LENGTH}文字以内で入力してください`);
  }

  return errors;
}
