import "server-only";
import {
  POLITICIAN_PROFILE_KEYS,
  Politician,
  type PoliticianInput,
  type PoliticianProfileInput,
} from "@/shared/models/politician";
import type { IPoliticianRepository } from "@/server/contexts/shared/domain/repositories/politician-repository.interface";

/**
 * 議員のプロフィール（ふりがな・院・選挙区・URL・SNS）だけを保存する（#2031）。
 * 担当の議員室（research_fund）が使うため、氏名・スラッグ・当選日・所属は入力に含まれていても無視し、保存済みの値を残す。
 */
export class SavePoliticianProfileUsecase {
  constructor(private repository: IPoliticianRepository) {}

  async execute(id: string, profile: PoliticianProfileInput) {
    const current = Politician.isValidId(id) ? await this.repository.findById(id) : null;
    if (!current) throw new Error("議員が見つかりません");
    const merged: PoliticianInput = {
      name: current.name,
      slug: current.slug,
      termStart: current.termStart,
      politicalOrganizationId: current.politicalOrganizationId,
      ...pickProfile(profile),
    };
    const normalized = Politician.normalize(merged);
    const validation = Politician.validate(normalized);
    if (validation.status === "invalid") throw new Error(validation.errors[0].message);
    await this.repository.save(id, normalized);
  }
}

function pickProfile(profile: PoliticianProfileInput): PoliticianProfileInput {
  if (!profile || typeof profile !== "object") throw new Error("入力内容を確認してください");
  return Object.fromEntries(
    POLITICIAN_PROFILE_KEYS.map((key) => [key, profile[key]]),
  ) as unknown as PoliticianProfileInput;
}
