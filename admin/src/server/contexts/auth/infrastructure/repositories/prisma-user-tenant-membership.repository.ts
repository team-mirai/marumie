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

/**
 * Prisma実装のユーザー・テナントメンバーシップリポジトリ
 */
export class PrismaUserTenantMembershipRepository implements UserTenantMembershipRepository {
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

    return memberships.map((m) => ({
      membership: {
        id: m.id,
        userId: m.userId,
        tenantId: m.tenantId,
        role: m.role as TenantRole,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      },
      tenantSlug: m.tenant.slug,
      tenantName: m.tenant.name,
    }));
  }

  async findByTenantId(tenantId: bigint): Promise<UserTenantMembership[]> {
    const memberships = await prisma.userTenantMembership.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
    });

    return memberships.map((m) => ({
      id: m.id,
      userId: m.userId,
      tenantId: m.tenantId,
      role: m.role as TenantRole,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    }));
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

    return {
      id: membership.id,
      userId: membership.userId,
      tenantId: membership.tenantId,
      role: membership.role as TenantRole,
      createdAt: membership.createdAt,
      updatedAt: membership.updatedAt,
    };
  }

  async create(input: CreateMembershipInput): Promise<UserTenantMembership> {
    const membership = await prisma.userTenantMembership.create({
      data: {
        userId: input.userId,
        tenantId: input.tenantId,
        role: input.role,
      },
    });

    return {
      id: membership.id,
      userId: membership.userId,
      tenantId: membership.tenantId,
      role: membership.role as TenantRole,
      createdAt: membership.createdAt,
      updatedAt: membership.updatedAt,
    };
  }

  async updateRole(id: bigint, role: TenantRole): Promise<UserTenantMembership> {
    const membership = await prisma.userTenantMembership.update({
      where: { id },
      data: { role },
    });

    return {
      id: membership.id,
      userId: membership.userId,
      tenantId: membership.tenantId,
      role: membership.role as TenantRole,
      createdAt: membership.createdAt,
      updatedAt: membership.updatedAt,
    };
  }

  async delete(id: bigint): Promise<void> {
    await prisma.userTenantMembership.delete({
      where: { id },
    });
  }
}
