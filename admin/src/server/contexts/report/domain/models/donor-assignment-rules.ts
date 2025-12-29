/**
 * 政治資金報告書におけるDonor紐づけルールを定義するドメインモデル
 *
 * このファイルは報告書の仕様（docs/report_format.md）に基づき、
 * どのトランザクションがDonor情報を必要とするかを定義します。
 */

import { PL_CATEGORIES } from "@/shared/accounting/account-category";
import type { DonorType } from "@/server/contexts/report/domain/models/donor";

/**
 * Donor紐づけ対象カテゴリとそれぞれで許可されるdonor_typeの定義
 */
export interface DonorCategoryRule {
  categoryKey: string;
  allowedDonorTypes: DonorType[];
}

/**
 * 個人からの寄附カテゴリ - individualのみ許可
 */
export const INDIVIDUAL_DONATION_CATEGORIES = [
  // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
  PL_CATEGORIES["個人からの寄附"].key,
  PL_CATEGORIES["個人からの寄附（特定寄附）"].key,
] as const;

/**
 * 法人その他の団体からの寄附カテゴリ - corporationのみ許可
 */
export const CORPORATE_DONATION_CATEGORIES = [
  // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
  PL_CATEGORIES["法人その他の団体からの寄附"].key,
] as const;

/**
 * 政治団体からの寄附カテゴリ - political_organizationのみ許可
 */
export const POLITICAL_DONATION_CATEGORIES = [
  // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
  PL_CATEGORIES["政治団体からの寄附"].key,
] as const;

/**
 * すべてのdonor_typeが許可されるカテゴリ
 */
export const ALL_DONOR_TYPE_CATEGORIES = [
  // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
  PL_CATEGORIES["寄附のあっせんによるもの"].key,
  // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
  PL_CATEGORIES["政治資金パーティーの対価に係る収入"].key,
  // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
  PL_CATEGORIES["政治資金パーティー対価のあっせんによるもの"].key,
] as const;

/**
 * Donor紐づけ対象の全カテゴリ
 */
export const DONOR_REQUIRED_CATEGORIES = [
  ...INDIVIDUAL_DONATION_CATEGORIES,
  ...CORPORATE_DONATION_CATEGORIES,
  ...POLITICAL_DONATION_CATEGORIES,
  ...ALL_DONOR_TYPE_CATEGORIES,
] as const;

export type DonorRequiredCategory = (typeof DONOR_REQUIRED_CATEGORIES)[number];

/**
 * カテゴリごとに許可されるdonor_typeのマッピング
 */
export const CATEGORY_ALLOWED_DONOR_TYPES: Record<string, DonorType[]> = {
  // 個人からの寄附 - individualのみ
  ...Object.fromEntries(
    INDIVIDUAL_DONATION_CATEGORIES.map((key) => [key, ["individual" as const]]),
  ),
  // 法人その他の団体からの寄附 - corporationのみ
  ...Object.fromEntries(
    CORPORATE_DONATION_CATEGORIES.map((key) => [key, ["corporation" as const]]),
  ),
  // 政治団体からの寄附 - political_organizationのみ
  ...Object.fromEntries(
    POLITICAL_DONATION_CATEGORIES.map((key) => [key, ["political_organization" as const]]),
  ),
  // すべて許可
  ...Object.fromEntries(
    ALL_DONOR_TYPE_CATEGORIES.map((key) => [
      key,
      ["individual" as const, "corporation" as const, "political_organization" as const],
    ]),
  ),
};

/**
 * トランザクションがDonor紐づけ対象かどうかを判定
 *
 * @param categoryKey - カテゴリキー
 * @returns Donor紐づけ対象の場合true
 */
export function isDonorRequired(categoryKey: string): boolean {
  return DONOR_REQUIRED_CATEGORIES.includes(categoryKey as DonorRequiredCategory);
}

/**
 * カテゴリに対して許可されるdonor_typeを取得
 *
 * @param categoryKey - カテゴリキー
 * @returns 許可されるdonor_typeの配列。Donor紐づけ対象外の場合は空配列
 */
export function getAllowedDonorTypes(categoryKey: string): DonorType[] {
  return CATEGORY_ALLOWED_DONOR_TYPES[categoryKey] ?? [];
}

/**
 * 指定されたdonor_typeがカテゴリで許可されているかを判定
 *
 * @param categoryKey - カテゴリキー
 * @param donorType - 判定するdonor_type
 * @returns 許可されている場合true
 */
export function isDonorTypeAllowedForCategory(categoryKey: string, donorType: DonorType): boolean {
  const allowedTypes = getAllowedDonorTypes(categoryKey);
  return allowedTypes.includes(donorType);
}

/**
 * 複数カテゴリで共通して許可されるdonor_typeを取得（積集合）
 *
 * @param categoryKeys - カテゴリキーの配列
 * @returns 全カテゴリで共通して許可されるdonor_typeの配列
 */
export function getCommonAllowedDonorTypes(categoryKeys: string[]): DonorType[] {
  if (categoryKeys.length === 0) {
    return [];
  }

  const allDonorTypes: DonorType[] = ["individual", "corporation", "political_organization"];

  // 各カテゴリで許可されるdonor_typeの積集合を計算
  return allDonorTypes.filter((donorType) =>
    categoryKeys.every((categoryKey) => isDonorTypeAllowedForCategory(categoryKey, donorType)),
  );
}
