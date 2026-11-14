import { MAX_SNS_URLS, isHttpUrl } from "@/shared/models/profile-links";

export interface PoliticalOrganization {
  id: string; // PostgreSQL BigInt converted to string for JSON serialization
  displayName: string;
  orgName: string | null;
  slug: string;
  description: string | null;
  /** 以下は公開サイトの政治団体カード・政治団体ページの見出しに出す（#1917） */
  /** 公式サイトの URL。未登録なら null */
  websiteUrl: string | null;
  /** SNS の URL（表示順どおり） */
  snsUrls: string[];
  /** 代表者の顔写真の Storage 上のキー。未登録なら null */
  photoPath: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PoliticalOrganizationLinks {
  websiteUrl: string;
  snsUrls: string[];
}

export const PoliticalOrganizationLinks = {
  /** 前後の空白を除き、空の SNS 欄を詰める */
  normalize(input: PoliticalOrganizationLinks): PoliticalOrganizationLinks {
    return {
      websiteUrl: input.websiteUrl.trim(),
      snsUrls: input.snsUrls.map((url) => url.trim()).filter((url) => url !== ""),
    };
  },
  /** 正規化した値を検証し、不正ならエラーメッセージを返す。未入力は通す */
  validate(input: PoliticalOrganizationLinks): string | null {
    if (input.websiteUrl && !isHttpUrl(input.websiteUrl))
      return "公式サイトの URL を正しく入力してください";
    if (input.snsUrls.length > MAX_SNS_URLS) return `SNS の URL は${MAX_SNS_URLS}件までです`;
    const invalidSns = input.snsUrls.findIndex((url) => !isHttpUrl(url));
    if (invalidSns >= 0) return `SNS の URL（${invalidSns + 1}件目）を正しく入力してください`;
    return null;
  },
};
