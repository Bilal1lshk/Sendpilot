import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const metadata = {
  title: "Dashboard | SendPilot LinkedIn CRM",
  description: "AI-powered LinkedIn outreach, lead database, and campaign management.",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <DashboardShell user={session.user}>
      {children}
    </DashboardShell>
  );
}
