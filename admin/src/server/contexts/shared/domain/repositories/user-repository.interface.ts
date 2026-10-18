import "server-only";
import type { UserRole } from "@prisma/client";

export interface User {
  id: string;
  authId: string;
  email: string;
  roles: UserRole[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRepository {
  create(data: { authId: string; email: string; roles?: UserRole[] }): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByAuthId(authId: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  updateRoles(authId: string, roles: UserRole[]): Promise<User>;
  delete(authId: string): Promise<void>;
  /** ユーザーが担当する議員の ID（#1773） */
  findAssignedPoliticianIds(userId: string): Promise<string[]>;
  /** 全ユーザーの担当（ユーザー ID → 担当する議員の ID）。担当のないユーザーは含まない */
  findAllAssignedPoliticianIds(): Promise<Map<string, string[]>>;
  /** ユーザーの担当を、渡した議員の集合に置き換える */
  replaceAssignedPoliticians(userId: string, politicianIds: readonly string[]): Promise<string[]>;
}
