import "server-only";

import type {
  CreateMembershipInput,
  UserTenantMembershipRepository,
} from "@/server/contexts/auth/domain/repositories/user-tenant-membership-repository.interface";
import type {
  UserTenantMembership,
  TenantMembershipWithTenant,
} from "@/server/contexts/auth/domain/models/user-tenant-membership";
import type { TenantRole } from "@/server/contexts/auth/domain/models/tenant-role";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";

/** Prismaから取得したメンバーシップレコードの型 */
type PrismaMembershipRecord = {
  id: bigint;
  userId: string;
  tenantId: bigint;
  role: string;
  createdAt: Date;
  updatedAt: Date;
};

/** テナント情報付きのPrismaメンバーシップレコードの型 */
type PrismaMembershipWithTenantRecord = PrismaMembershipRecord & {
  tenant: {
    slug: string;
    name: string;
  };
};

/**
 * Prisma実装のユーザー・テナントメンバーシップリポジトリ
 */
export class PrismaUserTenantMembershipRepository implements UserTenantMembershipRepository {
  /**
   * Prismaレコードをドメインモデルにマッピング
   */
  private mapToMembership(record: PrismaMembershipRecord): UserTenantMembership {
    return {
      id: record.id,
      userId: record.userId,
      tenantId: record.tenantId,
      role: record.role as TenantRole,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  /**
   * テナント情報付きPrismaレコードをドメインモデルにマッピング
   */
  private mapToMembershipWithTenant(
    record: PrismaMembershipWithTenantRecord,
  ): TenantMembershipWithTenant {
    return {
      membership: this.mapToMembership(record),
      tenantSlug: record.tenant.slug,
      tenantName: record.tenant.name,
    };
  }

  async findByUserId(userId: string): Promise<TenantMembershipWithTenant[]> {
    const memberships = await prisma.userTenantMembership.findMany({
      where: { userId },
      include: {
        tenant: {
          select: {
            slug: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return memberships.map((m) => this.mapToMembershipWithTenant(m));
  }

  async findByTenantId(tenantId: bigint): Promise<UserTenantMembership[]> {
    const memberships = await prisma.userTenantMembership.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
    });

    return memberships.map((m) => this.mapToMembership(m));
  }

  async findByUserAndTenant(
    userId: string,
    tenantId: bigint,
  ): Promise<UserTenantMembership | null> {
    const membership = await prisma.userTenantMembership.findUnique({
      where: {
        userId_tenantId: { userId, tenantId },
      },
    });

    if (!membership) return null;

    return this.mapToMembership(membership);
  }

  async create(input: CreateMembershipInput): Promise<UserTenantMembership> {
    const membership = await prisma.userTenantMembership.create({
      data: {
        userId: input.userId,
        tenantId: input.tenantId,
        role: input.role,
      },
    });

    return this.mapToMembership(membership);
  }

  async updateRole(id: bigint, role: TenantRole): Promise<UserTenantMembership> {
    const membership = await prisma.userTenantMembership.update({
      where: { id },
      data: { role },
    });

    return this.mapToMembership(membership);
  }

  async delete(id: bigint): Promise<void> {
    await prisma.userTenantMembership.delete({
      where: { id },
    });
  }
}
