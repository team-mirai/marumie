import "server-only";

// 新しい infrastructure 層の createSupabaseClient を re-export
// 後方互換性のため createClient という名前でエクスポート
export { createSupabaseClient as createClient } from "@/server/contexts/auth/infrastructure/supabase/supabase-client";
