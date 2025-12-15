import "server-only";
import { createServerClient } from "@supabase/ssr";

export async function createClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing required environment variables: SUPABASE_URL and SUPABASE_ANON_KEY");
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      async getAll() {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        return cookieStore.getAll();
      },
      async setAll(cookiesToSet) {
        try {
          const { cookies } = await import("next/headers");
          const cookieStore = await cookies();
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, {
              ...options,
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              maxAge: 60 * 60 * 24 * 7, // 7 days
              path: "/",
            });
          }
        } catch (_error) {}
      },
    },
  });
}
