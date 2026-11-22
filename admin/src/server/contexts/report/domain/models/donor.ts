export type DonorType = "individual" | "corporation" | "political_organization";

export interface Donor {
  id: string;
  donorType: DonorType;
  name: string;
  address: string | null;
  occupation: string | null;
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

/**
 * 同一寄付者とみなすためのキーを生成する
 *
 * 政治資金報告書では同一寄付者の寄付を合算して判定する必要があるため、
 * 「どの寄付者を同一とみなすか」は寄付者そのもののルールとしてここに集約する。
 * 現在の同一性判定は (name, address, donorType) の完全一致。
 *
 * @param name 寄付者名
 * @param address 住所（null は空文字と同一視する）
 * @param donorType 寄付者種別
 * @returns 同一性判定に使うキー文字列
 */
export function buildDonorMatchKey(
  name: string,
  address: string | null,
  donorType: DonorType,
): string {
  return JSON.stringify({ name, address: address ?? "", donorType });
}

/**
 * 寄付者の入力値。CSV の行のように種別が読み取れなかった入力も扱うため、種別は null を許す。
 */
interface DonorInputDraft {
  donorType: DonorType | null;
  name: string;
  address: string | null;
  occupation: string | null;
}

/**
 * 寄付者の入力を保存する形に正規化する。画面からの作成・更新と CSV の取り込みは必ずここを通す。
 *
 * - 名前・住所・職業の前後の空白を除く
 * - 空の住所・職業は未登録（null）とする
 * - 職業は個人だけが持つ。個人以外に入力された職業は保存しない
 */
export function normalizeDonorInput<T extends DonorType | null>(
  input: DonorInputDraft & { donorType: T },
): DonorInputDraft & { donorType: T } {
  const occupation = input.occupation?.trim() || null;
  return {
    donorType: input.donorType,
    name: input.name.trim(),
    address: input.address?.trim() || null,
    occupation: input.donorType === null || input.donorType === "individual" ? occupation : null,
  };
}

/**
 * 正規化済みの寄付者の入力を検証し、却下理由を返す（問題が無ければ空配列）。
 * 個人には職業が必須（政治資金規正法上、個人の寄附には職業の記載が必要）。
 */
export function validateDonorInput(input: DonorInputDraft): string[] {
  const errors: string[] = [];

  if (input.name.length === 0) {
    errors.push("名前は必須です");
  } else if (input.name.length > MAX_NAME_LENGTH) {
    errors.push(`名前は${MAX_NAME_LENGTH}文字以内で入力してください`);
  }

  if (input.donorType === null) {
    errors.push("寄付者種別は必須です");
  } else if (!isValidDonorType(input.donorType)) {
    errors.push("無効な寄付者種別です");
  }

  if (input.address && input.address.length > MAX_ADDRESS_LENGTH) {
    errors.push(`住所は${MAX_ADDRESS_LENGTH}文字以内で入力してください`);
  }

  if (input.donorType === "individual" && !input.occupation) {
    errors.push("個人の場合、職業は必須です");
  } else if (input.occupation && input.occupation.length > MAX_OCCUPATION_LENGTH) {
    errors.push(`職業は${MAX_OCCUPATION_LENGTH}文字以内で入力してください`);
  }

  return errors;
}

/**
 * 寄付者の入力を正規化して検証する。画面からの作成・更新はここを通す。
 */
export function prepareDonorInput(
  input: CreateDonorInput,
): { success: true; input: CreateDonorInput } | { success: false; errors: string[] } {
  const normalized = normalizeDonorInput(input);
  const errors = validateDonorInput(normalized);
  return errors.length > 0 ? { success: false, errors } : { success: true, input: normalized };
}

/**
 * 同じ寄付者（buildDonorMatchKey が一致する寄付者）が既に登録されていれば却下理由を返す。
 * 更新では自分自身を重複に数えず、名前・住所・種別を変えない更新は確認しない
 * （既に重複して登録されている寄付者でも、職業などの修正は止めない）。
 *
 * @param candidate 登録・更新しようとしている寄付者
 * @param existingDonors 同一性の候補として取得した既存の寄付者
 * @param current 更新前の寄付者（作成では指定しない）
 */
export function duplicateDonorRejectionReason(
  candidate: Pick<Donor, "name" | "address" | "donorType">,
  existingDonors: readonly Donor[],
  current?: Donor,
): string | null {
  const key = buildDonorMatchKey(candidate.name, candidate.address, candidate.donorType);
  if (current && buildDonorMatchKey(current.name, current.address, current.donorType) === key) {
    return null;
  }
  const duplicate = existingDonors.some(
    (donor) =>
      donor.id !== current?.id &&
      buildDonorMatchKey(donor.name, donor.address, donor.donorType) === key,
  );
  return duplicate ? "同じ名前・住所・種別の組み合わせが既に存在します" : null;
}

/**
 * 寄付者を削除できなければ却下理由を返す。
 * 取引に使われている寄付者も削除できる。削除すると取引との紐付けが外れるので、
 * 画面の確認ダイアログで使用件数を示して利用者に判断を委ねる。
 */
export function donorDeletionRejectionReason(_usageCount: number): string | null {
  return null;
}
