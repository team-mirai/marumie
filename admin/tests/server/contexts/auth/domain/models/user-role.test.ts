import { UserRoleModel } from "@/server/contexts/auth/domain/models/user-role";
import type { UserRole } from "@/server/contexts/auth/domain/models/user-role";

describe("UserRoleModel", () => {
  describe("hasPermission", () => {
    describe("admin権限が必要な場合", () => {
      it("adminロールはadmin権限を持つ", () => {
        const result = UserRoleModel.hasPermission("admin", "admin");
        expect(result).toBe(true);
      });

      it("userロールはadmin権限を持たない", () => {
        const result = UserRoleModel.hasPermission("user", "admin");
        expect(result).toBe(false);
      });
    });

    describe("user権限が必要な場合", () => {
      it("adminロールはuser権限を持つ", () => {
        const result = UserRoleModel.hasPermission("admin", "user");
        expect(result).toBe(true);
      });

      it("userロールはuser権限を持つ", () => {
        const result = UserRoleModel.hasPermission("user", "user");
        expect(result).toBe(true);
      });
    });
  });

  describe("isAdmin", () => {
    it("adminロールの場合はtrueを返す", () => {
      const result = UserRoleModel.isAdmin("admin");
      expect(result).toBe(true);
    });

    it("userロールの場合はfalseを返す", () => {
      const result = UserRoleModel.isAdmin("user");
      expect(result).toBe(false);
    });
  });
});
