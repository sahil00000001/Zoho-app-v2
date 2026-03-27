import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import AuthGuard from "@/components/AuthGuard";
import { AuthProvider } from "@/contexts/AuthContext";
import MainContainer from "@/components/MainContainer";
import { ToastProvider } from "@/components/Toast";
import CommandPalette from "@/components/CommandPalette";
import ScrollToTop from "@/components/ScrollToTop";
import MobileSidebarWrapper from "@/components/MobileSidebarWrapper";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthGuard>
        <ToastProvider>
          <MobileSidebarWrapper>
            {({ mobileSidebarOpen, setMobileSidebarOpen }) => (
              <div className="flex h-screen overflow-hidden" style={{ background: "#f8fafc" }}>
                <Sidebar mobileOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                  <TopBar onMenuClick={() => setMobileSidebarOpen(true)} />
                  <main className="flex-1 overflow-hidden flex flex-col">
                    <MainContainer>{children}</MainContainer>
                  </main>
                </div>
              </div>
            )}
          </MobileSidebarWrapper>
          <CommandPalette />
          <ScrollToTop />
        </ToastProvider>
      </AuthGuard>
    </AuthProvider>
  );
}
