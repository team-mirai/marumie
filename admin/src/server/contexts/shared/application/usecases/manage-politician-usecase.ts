import { Politician, type PoliticianInput } from "@/shared/models/politician";
import type { IPoliticianRepository } from "@/server/contexts/shared/domain/repositories/politician-repository.interface";

export class ManagePoliticianUsecase {
  constructor(private repository: IPoliticianRepository) {}

  list() {
    return this.repository.findAll();
  }
  find(id: string) {
    if (!/^[1-9]\d*$/.test(id)) return Promise.resolve(null);
    return this.repository.findById(id);
  }
  async save(id: string | null, input: PoliticianInput) {
    const validation = Politician.validate(input);
    if (validation.status === "invalid") throw new Error(validation.errors[0].message);
    if (id !== null && !(await this.find(id))) throw new Error("議員が見つかりません");
    await this.repository.save(id, { ...input, name: input.name.trim(), slug: input.slug.trim() });
  }
  async delete(id: string) {
    if (!(await this.find(id))) throw new Error("議員が見つかりません");
    await this.repository.delete(id);
  }
}
