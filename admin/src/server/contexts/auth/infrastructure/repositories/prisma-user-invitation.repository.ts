import "server-only";
import { Prisma, type PrismaClient } from "@prisma/client";
import type { UserRole } from "@/server/contexts/auth/domain/models/user-role";
import {
  UserInvitationModel,
  type UserInvitation,
} from "@/server/contexts/auth/domain/models/user-invitation";
import type { UserInvitationRepository } from "@/server/contexts/auth/domain/repositories/user-invitation-repository.interface";
import type { User } from "@/server/contexts/shared/domain/repositories/user-repository.interface";

const invitationInclude = {
  politicians: { select: { politicianId: true }, orderBy: { politicianId: "asc" } },
} satisfies Prisma.UserInvitationInclude;

type InvitationRow = Prisma.UserInvitationGetPayload<{ include: typeof invitationInclude }>;

function toDomain(row: InvitationRow): UserInvitation {
  return {
    id: row.id,
    email: row.email,
    roles: row.roles,
    politicianIds: row.politicians.map((p) => String(p.politicianId)),
    createdAt: row.createdAt,
  };
}

export class PrismaUserInvitationRepository implements UserInvitationRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(): Promise<UserInvitation[]> {
    const rows = await this.prisma.userInvitation.findMany({
      include: invitationInclude,
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toDomain);
  }

  async findByEmail(email: string): Promise<UserInvitation | null> {
    const row = await this.prisma.userInvitation.findUnique({
      where: { email },
      include: invitationInclude,
    });
    return row ? toDomain(row) : null;
  }

  async create(data: {
    email: string;
    roles: UserRole[];
    politicianIds: string[];
    createdById: string;
  }): Promise<UserInvitation | null> {
    try {
      const row = await this.prisma.userInvitation.create({
        data: {
          email: data.email,
          roles: data.roles,
          createdById: data.createdById,
          politicians: {
            create: data.politicianIds.map((id) => ({ politicianId: BigInt(id) })),
          },
        },
        include: invitationInclude,
      });
      return toDomain(row);
    } catch (e) {
      // 同じメールアドレスの招待が同時に登録された（email の一意制約）
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return null;
      throw e;
    }
  }

  async delete(id: string): Promise<boolean> {
    const { count } = await this.prisma.userInvitation.deleteMany({ where: { id } });
    return count > 0;
  }

  async createUserAcceptingInvitation(data: { authId: string; email: string }): Promise<User> {
    const invitationEmail = UserInvitationModel.normalizeEmail(data.email);
    return await this.prisma.$transaction(async (tx) => {
      // 招待を消せた場合だけ使う（同時に取り消された・使われた招待を二重に使わない）
      const invitation = invitationEmail
        ? await tx.userInvitation.findUnique({
            where: { email: invitationEmail },
            include: invitationInclude,
          })
        : null;
      const accepted =
        invitation &&
        (await tx.userInvitation.deleteMany({ where: { id: invitation.id } })).count > 0
          ? invitation
          : null;

      const user = await tx.user.create({
        data: { authId: data.authId, email: data.email, roles: accepted?.roles ?? [] },
      });
      if (accepted && accepted.politicians.length > 0) {
        await tx.userPoliticianAssignment.createMany({
          data: accepted.politicians.map((p) => ({
            userId: user.id,
            politicianId: p.politicianId,
          })),
        });
      }
      return user;
    });
  }
}
