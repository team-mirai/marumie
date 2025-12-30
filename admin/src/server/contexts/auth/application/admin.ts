import "server-only";

// 新しい infrastructure 層の createSupabaseAdminClient を re-export
// 後方互換性のため createAdminClient という名前でエクスポート
export { createSupabaseAdminClient as createAdminClient } from "@/server/contexts/auth/infrastructure/supabase/supabase-admin-client";
