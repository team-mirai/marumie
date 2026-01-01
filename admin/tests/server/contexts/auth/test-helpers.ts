import type { AuthProvider } from "@/server/contexts/auth/domain/providers/auth-provider.interface";
import type { AdminAuthProvider } from "@/server/contexts/auth/domain/providers/admin-auth-provider.interface";
import type {
  UserRepository,
  User,
} from "@/server/contexts/shared/domain/repositories/user-repository.interface";
import type { SupabaseAuthUser } from "@/server/contexts/auth/domain/models/supabase-auth-user";
import type { AuthSession } from "@/server/contexts/auth/domain/models/auth-session";

export const createMockSupabaseUser = (
  overrides: Partial<SupabaseAuthUser> = {}
): SupabaseAuthUser => ({
  id: "auth-user-id",
  email: "test@example.com",
  emailConfirmedAt: "2024-01-01T00:00:00Z",
  lastSignInAt: "2024-01-01T00:00:00Z",
  ...overrides,
});

export const createMockSession = (
  overrides: Partial<AuthSession> = {}
): AuthSession => ({
  accessToken: "access-token",
  refreshToken: "refresh-token",
  user: createMockSupabaseUser(),
  ...overrides,
});

export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: "user-id",
  authId: "auth-user-id",
  email: "test@example.com",
  role: "user",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  ...overrides,
});

export const createMockAuthProvider = (): jest.Mocked<AuthProvider> => ({
  signInWithPassword: jest.fn(),
  signOut: jest.fn(),
  getUser: jest.fn(),
  updateUser: jest.fn(),
  setSession: jest.fn(),
  exchangeCodeForSession: jest.fn(),
  resetPasswordForEmail: jest.fn(),
});

export const createMockAdminAuthProvider =
  (): jest.Mocked<AdminAuthProvider> => ({
    inviteUserByEmail: jest.fn(),
  });

export const createMockUserRepository = (): jest.Mocked<UserRepository> => ({
  create: jest.fn(),
  findById: jest.fn(),
  findByAuthId: jest.fn(),
  findByEmail: jest.fn(),
  findAll: jest.fn(),
  updateRole: jest.fn(),
  delete: jest.fn(),
});
