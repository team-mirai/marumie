import type { UserRole } from "@/server/contexts/auth/domain/models/user-role";
import type { UserInvitation } from "@/server/contexts/auth/domain/models/user-invitation";
import type { User } from "@/server/contexts/shared/domain/repositories/user-repository.interface";

/** 初回ログイン前の人への招待（予約。#1882）のリポジトリ */
export interface UserInvitationRepository {
  /** 未使用の招待の一覧（新しい順） */
  findAll(): Promise<UserInvitation[]>;
  /** 正規化したメールアドレスで招待を探す */
  findByEmail(email: string): Promise<UserInvitation | null>;
  /**
   * 招待を登録する。
   * @returns 登録した招待。同じメールアドレスの招待が同時に登録されていた場合は null
   */
  create(data: {
    email: string;
    roles: UserRole[];
    politicianIds: string[];
    createdById: string;
  }): Promise<UserInvitation | null>;
  /**
   * 招待を取り消す。
   * @returns 取り消した場合は true。既に無かった（使われた・取り消された）場合は false
   */
  delete(id: string): Promise<boolean>;
  /**
   * 初回ログインの人の User を作り、そのメールアドレスへの招待があれば使う。
   * User の作成・ロールと担当議員の付与・招待の削除を 1 つのトランザクションで行う。
   * 招待が無ければロールなし・担当なしで作る。
   */
  createUserAcceptingInvitation(data: { authId: string; email: string }): Promise<User>;
}
