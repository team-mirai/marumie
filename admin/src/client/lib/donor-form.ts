import type { DonorType } from "@/server/contexts/report/domain/models/donor";
import {
  normalizeDonorInput,
  validateDonorInput,
  VALID_DONOR_TYPES,
} from "@/server/contexts/report/domain/models/donor";

export interface DonorFormValues {
  donorType: DonorType;
  name: string;
  address: string;
  occupation: string;
}

export interface DonorFormSubmitData {
  donorType: DonorType;
  name: string;
  address: string | null;
  occupation: string | null;
}

/**
 * フォームで選択可能な寄付者種別を解決する。
 * 未指定・空配列のときは全種別を選択可能とする（空配列で選択肢が消えてフォームが詰まるのを防ぐ）。
 */
export function resolveAllowedDonorTypes(allowedDonorTypes?: readonly DonorType[]): DonorType[] {
  return allowedDonorTypes && allowedDonorTypes.length > 0
    ? [...allowedDonorTypes]
    : [...VALID_DONOR_TYPES];
}

/**
 * 現在の種別が許可外なら許可リストの先頭に補正する（紐付け対象のカテゴリによる制約に合わせる）。
 * `allowedDonorTypes` は resolveAllowedDonorTypes 済みの空でない配列を渡すこと。
 */
export function coerceDonorType(
  donorType: DonorType,
  allowedDonorTypes: readonly DonorType[],
): DonorType {
  return allowedDonorTypes.includes(donorType) ? donorType : allowedDonorTypes[0];
}

/** 入力値がサーバーで受け付けられる形か（寄付者のドメインと同じ検証）。送信ボタンの活性に使う */
export function isDonorFormValid(values: DonorFormValues): boolean {
  return validateDonorInput(toDonorFormSubmitData(values)).length === 0;
}

/** 入力値を寄付者のドメインのルールで送信用データに正規化する */
export function toDonorFormSubmitData(values: DonorFormValues): DonorFormSubmitData {
  return normalizeDonorInput(values);
}
