import "server-only";
import type { PrismaClient, UserRole } from "@prisma/client";
import type {
  User,
  UserRepository,
} from "@/server/contexts/shared/domain/repositories/user-repository.interface";

export class PrismaUserRepository implements UserRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: { authId: string; email: string; role?: UserRole }): Promise<User> {
    return await this.prisma.user.create({
      data: {
        authId: data.authId,
        email: data.email,
        role: data.role ?? "user",
      },
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

  async updateRole(authId: string, role: UserRole): Promise<User> {
    return await this.prisma.user.update({
      where: { authId },
      data: { role },
    });
  }

  async delete(authId: string): Promise<void> {
    await this.prisma.user.delete({
      where: { authId },
    });
  }
}
