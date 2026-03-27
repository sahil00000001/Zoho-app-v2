import AuthGuard from "@/components/AuthGuard";
import { AuthProvider } from "@/contexts/AuthContext";
import MainContainer from "@/components/MainContainer";
import { ToastProvider } from "@/components/Toast";
import CommandPalette from "@/components/CommandPalette";
import ScrollToTop from "@/components/ScrollToTop";
import DashboardShell from "@/components/DashboardShell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthGuard>
        <ToastProvider>
          <DashboardShell>
            <MainContainer>{children}</MainContainer>
          </DashboardShell>
          <CommandPalette />
          <ScrollToTop />
        </ToastProvider>
      </AuthGuard>
    </AuthProvider>
  );
}
