import "server-only";
import { redirect } from "next/navigation";

/** 存在しない URL はトップページへ移す */
export default function NotFound() {
  redirect("/");
}
