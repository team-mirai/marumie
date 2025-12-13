import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/server/contexts/auth/application/client";
import { prisma } from "@/server/lib/prisma";
import { PrismaUserRepository } from "@/server/repositories/prisma-user.repository";
const userRepository = new PrismaUserRepository(prisma);

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();

    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      try {
        // Check if user already exists in Prisma
        const existingUser = await userRepository.findByAuthId(data.user.id);

        if (!existingUser) {
          // Create user in Prisma database for invited users
          const email = data.user.email;
          if (!email) {
            throw new Error("User email is required");
          }
          await userRepository.create({
            authId: data.user.id,
            email: email,
            role: "user", // Default role for invited users
          });
        }

        // For invited users (email confirmed but no previous sign in), redirect to setup
        if (data.user.email_confirmed_at && !data.user.last_sign_in_at) {
          return NextResponse.redirect(`${origin}/auth/setup`);
        }

        // Redirect to the admin panel after successful authentication
        return NextResponse.redirect(`${origin}/`);
      } catch (dbError) {
        console.error("Error creating user in database:", dbError);
        // Even if DB creation fails, redirect to login to show the error
        return NextResponse.redirect(`${origin}/login?error=database_error`);
      }
    }
  }

  // If there was an error or no code, redirect to login
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
