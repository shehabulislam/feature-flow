import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Customers don't have dashboard access - redirect them back
  if ((session.user as any).role === "customer") {
    redirect("/");
  }

  return <DashboardShell user={session.user}>{children}</DashboardShell>;
}
