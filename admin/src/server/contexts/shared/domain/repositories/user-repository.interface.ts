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
}
