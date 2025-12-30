import "server-only";
import { NextResponse } from "next/server";
import { loadAllUsers } from "@/server/contexts/auth/presentation/loaders/load-all-users";

export async function GET() {
  try {
    const users = await loadAllUsers();
    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
