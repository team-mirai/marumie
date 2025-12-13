import { signOut } from "@/server/contexts/auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  await signOut();
  return NextResponse.json({ success: true });
}
