import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";

export default async function PostLogin() {
  const s = await requireSession();
  switch (s.user.role) {
    case "ADMIN": redirect("/admin");
    case "MANAGER": redirect("/team");
    case "VERIFIER": redirect("/work");
    default: redirect("/me");
  }
}
