import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { UserPanel } from "@/components/UserPanel";

export default async function PenggunaPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/dashboard");

  return <UserPanel currentUserId={session.uid} />;
}
