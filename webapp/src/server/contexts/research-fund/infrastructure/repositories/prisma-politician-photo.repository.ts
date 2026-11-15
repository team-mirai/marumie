import "server-only";
import type { PrismaClient } from "@prisma/client";
import type {
  PoliticianPhotoRepository,
  PoliticianPhotoSource,
} from "@/server/contexts/research-fund/domain/repositories/politician-photo-repository.interface";

export class PrismaPoliticianPhotoRepository implements PoliticianPhotoRepository {
  constructor(private prisma: PrismaClient) {}

  async findPhoto(slug: string): Promise<PoliticianPhotoSource | null> {
    const politician = await this.prisma.politician.findUnique({
      where: { slug },
      select: { isResearchFundPublic: true, photoPath: true },
    });
    if (!politician) return null;
    return { isPublic: politician.isResearchFundPublic, photoPath: politician.photoPath };
  }
}
