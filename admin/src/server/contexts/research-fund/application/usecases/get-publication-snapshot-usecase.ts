import "server-only";
import { PublicationError } from "@/server/contexts/research-fund/domain/models/publication";
import type { PublicationRepository } from "@/server/contexts/research-fund/domain/repositories/publication-repository.interface";

export class GetPublicationSnapshotUsecase {
  constructor(private repository: PublicationRepository) {}

  async execute(bookId: string) {
    const snapshot = await this.repository.snapshot(bookId);
    if (!snapshot) throw new PublicationError("帳簿が見つかりません");
    return snapshot;
  }
}
