export interface PoliticianInput {
  name: string;
  slug: string;
  termStart: string;
  politicalOrganizationId: string;
}

export interface Politician extends PoliticianInput {
  id: string;
  politicalOrganizationName: string | null;
}

const VALIDATION_CODES = {
  INVALID: "POLITICIAN_INVALID_INPUT",
} as const;

function invalid(path: string, message: string) {
  return {
    status: "invalid" as const,
    errors: [{ path, code: VALIDATION_CODES.INVALID, message, severity: "error" as const }],
  };
}

export const Politician = {
  validate(input: PoliticianInput) {
    if (
      !input ||
      [input.name, input.slug, input.termStart, input.politicalOrganizationId].some(
        (value) => typeof value !== "string",
      )
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
    return { status: "valid" as const };
  },
};
