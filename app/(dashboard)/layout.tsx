import { AuthProvider } from "@/components/auth/auth-context";
import { DashboardShell } from "@/components/dashboard/shell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardShell>{children}</DashboardShell>
    </AuthProvider>
  );
}
