/**
 * トップページで政党と政治団体を見分けるための種別。
 * admin の収支報告書の設定で入力する政治団体区分（DANTAI_KBN の 2 桁コード）から決める。
 */
export type OrganizationKind = "party" | "group";

/** 政治団体区分のうち政党に当たるコード（01: 政党本部、02: 政党の支部） */
const PARTY_TYPE_CODES: readonly string[] = ["01", "02"];

export const OrganizationKind = {
  /** 年ごとの政治団体区分のどれかが政党なら政党、未入力を含めそれ以外は政治団体とする */
  fromTypeCodes(typeCodes: readonly string[]): OrganizationKind {
    return typeCodes.some((code) => PARTY_TYPE_CODES.includes(code.trim())) ? "party" : "group";
  },
};
