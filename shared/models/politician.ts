/** 議員の院。shugiin = 衆議院 / sangiin = 参議院 */
export const POLITICIAN_HOUSES = ["shugiin", "sangiin"] as const;
export type PoliticianHouse = (typeof POLITICIAN_HOUSES)[number];
export const POLITICIAN_HOUSE_LABELS: Record<PoliticianHouse, string> = {
  shugiin: "衆議院",
  sangiin: "参議院",
};

/** SNS の URL を登録できる上限。v8 の表示例で 7 件なので余裕をもたせる */
const MAX_SNS_URLS = 20;
const MAX_URL_LENGTH = 2048;

export interface PoliticianInput {
  name: string;
  slug: string;
  termStart: string;
  politicalOrganizationId: string;
  /** 以下は公開サイトの議員カード・議員ページの見出しに出すプロフィール（#1916）。未入力は空文字・空配列 */
  nameKana: string;
  house: PoliticianHouse | "";
  constituency: string;
  /** チームみらい公式サイト内のプロフィールページ */
  profileUrl: string;
  /** 議員の公式サイト */
  websiteUrl: string;
  /** SNS の URL（表示順どおり） */
  snsUrls: string[];
}

export interface Politician extends PoliticianInput {
  id: string;
  politicalOrganizationName: string | null;
  /** 調研費を公開するか。false なら議員ページはプレビュー URL でだけ開け、webapp の導線・sitemap に出さず noindex にする */
  isResearchFundPublic: boolean;
  /** 顔写真の Storage 上のキー。未登録なら null */
  photoPath: string | null;
}

const VALIDATION_CODES = {
  INVALID: "POLITICIAN_INVALID_INPUT",
} as const;

function isHttpUrl(value: string) {
  if (value.length > MAX_URL_LENGTH) return false;
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && !!url.hostname;
  } catch {
    return false;
  }
}

function invalid(path: string, message: string) {
  return {
    status: "invalid" as const,
    errors: [{ path, code: VALIDATION_CODES.INVALID, message, severity: "error" as const }],
  };
}

export const Politician = {
  /** 議員 ID として扱える文字列か（正の整数）。不正な ID はリポジトリへ渡さない */
  isValidId(id: string) {
    return /^[1-9]\d*$/.test(id);
  },
  /** 前後の空白を除き、空の SNS 欄を詰める。validate の前に通す */
  normalize(input: PoliticianInput): PoliticianInput {
    if (!input) return input;
    const trim = (value: unknown) => (typeof value === "string" ? value.trim() : value);
    return {
      ...input,
      name: trim(input.name),
      slug: trim(input.slug),
      nameKana: trim(input.nameKana),
      constituency: trim(input.constituency),
      profileUrl: trim(input.profileUrl),
      websiteUrl: trim(input.websiteUrl),
      snsUrls: Array.isArray(input.snsUrls)
        ? input.snsUrls.map(trim).filter((url) => url !== "")
        : input.snsUrls,
    } as PoliticianInput;
  },
  validate(input: PoliticianInput) {
    if (
      !input ||
      [
        input.name,
        input.slug,
        input.termStart,
        input.politicalOrganizationId,
        input.nameKana,
        input.house,
        input.constituency,
        input.profileUrl,
        input.websiteUrl,
      ].some((value) => typeof value !== "string") ||
      !Array.isArray(input.snsUrls) ||
      input.snsUrls.some((value) => typeof value !== "string")
    )
      return invalid("input", "入力内容を確認してください");
    if (!input.name.trim()) return invalid("name", "氏名を入力してください");
    if (!input.slug.trim()) return invalid("slug", "スラッグを入力してください");
    if (input.name.trim().length > 255 || input.slug.trim().length > 255)
      return invalid("input", "氏名・スラッグは255文字以内で入力してください");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug.trim()))
      return invalid("slug", "スラッグは半角英小文字・数字・ハイフンで入力してください");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.termStart))
      return invalid("termStart", "当選日を入力してください");
    const date = new Date(input.termStart);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== input.termStart)
      return invalid("termStart", "有効な当選日を入力してください");
    if (input.politicalOrganizationId && !/^[1-9]\d*$/.test(input.politicalOrganizationId))
      return invalid("politicalOrganizationId", "所属する政治団体を選択してください");
    if (input.nameKana.length > 255 || input.constituency.length > 255)
      return invalid("input", "ふりがな・選挙区は255文字以内で入力してください");
    if (input.house && !(POLITICIAN_HOUSES as readonly string[]).includes(input.house))
      return invalid("house", "院を選択してください");
    if (input.profileUrl && !isHttpUrl(input.profileUrl))
      return invalid("profileUrl", "プロフィールページの URL を正しく入力してください");
    if (input.websiteUrl && !isHttpUrl(input.websiteUrl))
      return invalid("websiteUrl", "公式サイトの URL を正しく入力してください");
    if (input.snsUrls.length > MAX_SNS_URLS)
      return invalid("snsUrls", `SNS の URL は${MAX_SNS_URLS}件までです`);
    const invalidSns = input.snsUrls.findIndex((url) => !isHttpUrl(url));
    if (invalidSns >= 0)
      return invalid("snsUrls", `SNS の URL（${invalidSns + 1}件目）を正しく入力してください`);
    return { status: "valid" as const };
  },
};
