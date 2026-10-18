import "server-only";
import type { PrismaClient, UserRole } from "@prisma/client";
import type {
  User,
  UserRepository,
} from "@/server/contexts/shared/domain/repositories/user-repository.interface";

export class PrismaUserRepository implements UserRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: { authId: string; email: string; roles?: UserRole[] }): Promise<User> {
    return await this.prisma.user.create({
      data: {
        authId: data.authId,
        email: data.email,
        roles: data.roles ?? [],
      },
    });
  }

  async findById(id: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByAuthId(authId: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: { authId },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findAll(): Promise<User[]> {
    return await this.prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  async updateRoles(authId: string, roles: UserRole[]): Promise<User> {
    return await this.prisma.user.update({
      where: { authId },
      data: { roles },
    });
  }

  async delete(authId: string): Promise<void> {
    await this.prisma.user.delete({
      where: { authId },
    });
  }

  async findAssignedPoliticianIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.userPoliticianAssignment.findMany({
      where: { userId },
      orderBy: { politicianId: "asc" },
      select: { politicianId: true },
    });
    return rows.map((row) => String(row.politicianId));
  }

  async findAllAssignedPoliticianIds(): Promise<Map<string, string[]>> {
    const rows = await this.prisma.userPoliticianAssignment.findMany({
      orderBy: [{ userId: "asc" }, { politicianId: "asc" }],
      select: { userId: true, politicianId: true },
    });
    const assignments = new Map<string, string[]>();
    for (const row of rows) {
      assignments.set(row.userId, [
        ...(assignments.get(row.userId) ?? []),
        String(row.politicianId),
      ]);
    }
    return assignments;
  }

  async replaceAssignedPoliticians(
    userId: string,
    politicianIds: readonly string[],
  ): Promise<string[]> {
    await this.prisma.$transaction([
      this.prisma.userPoliticianAssignment.deleteMany({ where: { userId } }),
      this.prisma.userPoliticianAssignment.createMany({
        data: politicianIds.map((politicianId) => ({ userId, politicianId: BigInt(politicianId) })),
      }),
    ]);
    return await this.findAssignedPoliticianIds(userId);
  }
}
