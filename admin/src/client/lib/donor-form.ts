import type { DonorType } from "@/server/contexts/report/domain/models/donor";
import { VALID_DONOR_TYPES } from "@/server/contexts/report/domain/models/donor";

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

/** 名前は必須。個人の場合は職業も必須（政治資金規正法上、個人寄附には職業の記載が必要）。 */
export function isDonorFormValid(values: DonorFormValues): boolean {
  if (values.name.trim() === "") return false;
  if (values.donorType === "individual" && values.occupation.trim() === "") return false;
  return true;
}

/**
 * 入力値を送信用データに整形する。前後空白を除去し、住所の空文字は null に、
 * 個人以外の職業は入力が残っていても null にする。
 */
export function toDonorFormSubmitData(values: DonorFormValues): DonorFormSubmitData {
  const isIndividual = values.donorType === "individual";
  return {
    donorType: values.donorType,
    name: values.name.trim(),
    address: values.address.trim() || null,
    occupation: isIndividual ? values.occupation.trim() || null : null,
  };
}
