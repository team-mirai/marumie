import "server-only";
import { getCurrentUser } from "@/server/contexts/auth";
import { redirect } from "next/navigation";
import SetupForm from "@/client/components/auth/SetupForm";

interface SetupPageProps {
  searchParams: Promise<{ from?: string }>;
}

export default async function SetupPage({ searchParams }: SetupPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Check if this is coming from an invitation flow
  const params = await searchParams;
  const fromInvite = params.from === "invite";

  if (fromInvite) {
    // This is an invited user who needs to set up their password
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Complete your account setup
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              You&apos;ve been invited to join Poli Money Alpha. Please set up
              your password to continue.
            </p>
          </div>
          <SetupForm userEmail={user.email} />
        </div>
      </div>
    );
  }

  // User is already set up, redirect to main app
  redirect("/");
}
