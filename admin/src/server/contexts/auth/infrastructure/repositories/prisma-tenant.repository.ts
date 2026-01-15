import "server-only";

import type {
  CreateTenantInput,
  TenantRepository,
} from "@/server/contexts/auth/domain/repositories/tenant-repository.interface";
import type { Tenant } from "@/server/contexts/auth/domain/models/tenant";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";

/**
 * Prisma実装のテナントリポジトリ
 */
export class PrismaTenantRepository implements TenantRepository {
  async findById(id: bigint): Promise<Tenant | null> {
    const tenant = await prisma.tenant.findUnique({
      where: { id },
    });
    return tenant;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
    });
    return tenant;
  }

  async create(input: CreateTenantInput): Promise<Tenant> {
    const tenant = await prisma.tenant.create({
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
      },
    });
    return tenant;
  }

  async update(id: bigint, input: Partial<CreateTenantInput>): Promise<Tenant> {
    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.slug !== undefined && { slug: input.slug }),
        ...(input.description !== undefined && {
          description: input.description,
        }),
      },
    });
    return tenant;
  }
}
