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

/** 政治団体の作成・更新で受け取る入力。公式サイト・SNS は渡されたときだけ扱う */
export interface PoliticalOrganizationInput {
  displayName: string;
  slug: string;
  orgName?: string;
  description?: string;
  websiteUrl?: string;
  snsUrls?: string[];
}

/** 正規化した入力。空の任意項目は未登録（null）。公式サイト・SNS は渡されなければ省く */
export interface NormalizedPoliticalOrganizationInput {
  displayName: string;
  slug: string;
  orgName: string | null;
  description: string | null;
  websiteUrl?: string | null;
  snsUrls?: string[];
}

export const PoliticalOrganizationInput = {
  /** 前後の空白を除き、空の任意項目を未登録（null）にする */
  normalize(input: PoliticalOrganizationInput): NormalizedPoliticalOrganizationInput {
    const links = PoliticalOrganizationLinks.normalize({
      websiteUrl: input.websiteUrl ?? "",
      snsUrls: input.snsUrls ?? [],
    });
    return {
      displayName: input.displayName.trim(),
      slug: input.slug.trim(),
      orgName: input.orgName?.trim() || null,
      description: input.description?.trim() || null,
      ...(input.websiteUrl !== undefined && { websiteUrl: links.websiteUrl || null }),
      ...(input.snsUrls !== undefined && { snsUrls: links.snsUrls }),
    };
  },
  /** 表示名・スラッグが入力されていなければエラーメッセージを返す */
  validateRequired(input: Pick<PoliticalOrganizationInput, "displayName" | "slug">): string | null {
    if (!input.displayName.trim()) return "表示名は必須です";
    if (!input.slug.trim()) return "スラッグは必須です";
    return null;
  },
  /** 正規化した入力を検証し、不正ならエラーメッセージを返す */
  validate(input: NormalizedPoliticalOrganizationInput): string | null {
    return (
      PoliticalOrganizationInput.validateRequired(input) ??
      PoliticalOrganizationLinks.validate({
        websiteUrl: input.websiteUrl ?? "",
        snsUrls: input.snsUrls ?? [],
      })
    );
  },
};
