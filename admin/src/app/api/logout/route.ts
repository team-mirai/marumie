import { signOut } from "@/server/contexts/auth/presentation/actions/logout";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  const result = await signOut();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
