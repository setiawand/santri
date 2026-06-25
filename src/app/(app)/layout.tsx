import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Sidebar } from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      <Sidebar user={{ nama: session.nama, email: session.email, role: session.role }} />
      <main className="flex-1 min-w-0 overflow-x-hidden">{children}</main>
    </div>
  );
}
