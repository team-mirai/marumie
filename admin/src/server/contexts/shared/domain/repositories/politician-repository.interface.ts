import "server-only";
import type { Politician, PoliticianInput } from "@/shared/models/politician";

export interface IPoliticianRepository {
  findAll(): Promise<Politician[]>;
  findById(id: string): Promise<Politician | null>;
  save(id: string | null, input: PoliticianInput): Promise<void>;
  delete(id: string): Promise<void>;
}
