import type { SignInProvider } from "@/server/contexts/auth/domain/models/auth-session";
import type { UserRole } from "@/server/contexts/auth/domain/models/user-role";

/**
 * 初回ログイン前の人に付けておくロールと担当議員の招待（予約。#1882）
 *
 * ユーザー（User）は「実際にログインした人」だけを表し、まだログインしていない人は招待として別に持つ。
 * 招待メールは送らない。招待したメールアドレスの持ち主が初めてログインしたとき、
 * User を作るのと同じトランザクションでロールと担当議員を付け、招待を消す。
 */
export interface UserInvitation {
  id: string;
  /** 小文字に正規化したメールアドレス */
  email: string;
  roles: UserRole[];
  /** 担当する議員の ID */
  politicianIds: string[];
  createdAt: Date;
}

/** 招待を登録できない理由 */
type UserInvitationConflict = "USER_ALREADY_EXISTS" | "INVITATION_ALREADY_EXISTS";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export namespace UserInvitationModel {
  /**
   * 招待のメールアドレスを正規化する（前後の空白を除き、小文字にそろえる）。
   * 大文字・小文字の違いで別人として扱わないため、保存も照合もこの形で行う。
   * @returns メールアドレスとして不正な場合は null
   */
  export function normalizeEmail(email: string): string | null {
    const normalized = email.trim().toLowerCase();
    if (normalized.length > 255 || !EMAIL_PATTERN.test(normalized)) return null;
    return normalized;
  }

  /**
   * 招待を登録できるか判定する。既にユーザーがいる人や、未使用の招待が既にある人には登録できない
   * （招待の内容を変えたいときは、取り消して登録し直す）。
   * @returns 登録できない理由。登録できる場合は null
   */
  export function findConflict(state: {
    hasUser: boolean;
    hasPendingInvitation: boolean;
  }): UserInvitationConflict | null {
    if (state.hasUser) return "USER_ALREADY_EXISTS";
    if (state.hasPendingInvitation) return "INVITATION_ALREADY_EXISTS";
    return null;
  }

  /**
   * 初回ログインで招待を使ってよいか判定する。
   * 招待を使うのは、メールアドレスの持ち主だと確かめられたログインに限る。
   * - 招待リンク・マジックリンクなどメールのリンク経由（signInProvider が null）
   * - 許可ドメインの Google ログイン（ドメインの判定を通った後に限る）
   *
   * 自分でパスワード登録したアカウントのログイン（password）では使わない。
   * メール確認が無効な環境では他人のメールアドレスで登録できてしまい、その人が招待のロールを得てしまうため。
   * @param googleDomainVerified Google ログインが許可ドメインの判定を通ったか
   */
  export function canAcceptOnFirstLogin(
    signInProvider: SignInProvider,
    googleDomainVerified: boolean,
  ): boolean {
    if (signInProvider === null) return true;
    return signInProvider === "google" && googleDomainVerified;
  }
}
