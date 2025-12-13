import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Sidebar from "@/client/components/layout/Sidebar";
import { logout } from "@/server/contexts/auth/application/login";
import { getCurrentUserRole } from "@/server/contexts/auth/application/roles";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    redirect("/login");
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // No-op for server components
      },
    },
  });

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }
  } catch (error) {
    console.error("Authentication error:", error);
    redirect("/login");
  }

  // Get user role on server side
  const userRole = await getCurrentUserRole();

  return (
    <div className="grid grid-cols-[220px_1fr] h-screen">
      <Sidebar logoutAction={logout} userRole={userRole} />
      <main className="p-5 overflow-auto">{children}</main>
    </div>
  );
}
