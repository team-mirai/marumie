export interface Counterpart {
  id: string;
  name: string;
  postalCode: string | null;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CounterpartWithUsage extends Counterpart {
  usageCount: number;
}

export interface CreateCounterpartInput {
  name: string;
  postalCode: string | null;
  address: string | null;
}

export interface UpdateCounterpartInput {
  name?: string;
  postalCode?: string | null;
  address?: string | null;
}

export const MAX_NAME_LENGTH = 120;
export const MAX_ADDRESS_LENGTH = 120;
export const MAX_POSTAL_CODE_LENGTH = 10;

/** 取引先の作成・更新で受け取る入力の正規化と検証 */
export const CounterpartInput = {
  /** 前後の空白を除き、空の郵便番号・住所を未登録（null）にする */
  normalize(input: CreateCounterpartInput): CreateCounterpartInput {
    return {
      name: input.name.trim(),
      postalCode: input.postalCode?.trim() || null,
      address: input.address?.trim() || null,
    };
  },

  /** 更新の入力を今の値に重ねて正規化する。渡されなかった項目（undefined）は今の値のまま */
  normalizeUpdate(existing: Counterpart, input: UpdateCounterpartInput): CreateCounterpartInput {
    return CounterpartInput.normalize({
      name: input.name ?? existing.name,
      postalCode: input.postalCode === undefined ? existing.postalCode : input.postalCode,
      address: input.address === undefined ? existing.address : input.address,
    });
  },

  /** 正規化した入力を検証し、エラーメッセージの一覧を返す（空なら妥当） */
  validate(input: CreateCounterpartInput): string[] {
    const errors: string[] = [];
    const name = input.name.trim();
    const postalCode = input.postalCode?.trim() ?? "";
    const address = input.address?.trim() ?? "";

    if (name.length === 0) {
      errors.push("名前は必須です");
    } else if (name.length > MAX_NAME_LENGTH) {
      errors.push(`名前は${MAX_NAME_LENGTH}文字以内で入力してください`);
    }

    if (postalCode.length > MAX_POSTAL_CODE_LENGTH) {
      errors.push(`郵便番号は${MAX_POSTAL_CODE_LENGTH}文字以内で入力してください`);
    }

    if (address.length > MAX_ADDRESS_LENGTH) {
      errors.push(`住所は${MAX_ADDRESS_LENGTH}文字以内で入力してください`);
    }

    return errors;
  },
};

/** 同じ名前と住所の取引先は登録できない */
export const CounterpartUniqueness = {
  /**
   * 同じ名前・住所で見つかった取引先が自分以外なら却下理由を返す。
   * selfId は更新時の自分の ID（作成時は省略）
   */
  rejectionReason(sameNameAndAddress: Counterpart | null, selfId?: string): string | null {
    if (sameNameAndAddress && sameNameAndAddress.id !== selfId) {
      return "同じ名前・住所の組み合わせが既に存在します";
    }
    return null;
  },
};

/** 取引先を削除してよいかの判定 */
export const CounterpartDeletion = {
  /** 取引で使用中の取引先は削除できない。削除できなければ却下理由を返す */
  rejectionReason(usageCount: number): string | null {
    if (usageCount > 0) {
      return `この取引先は${usageCount}件のトランザクションで使用されています。削除するには先に関連するトランザクションを削除してください。`;
    }
    return null;
  },
};
