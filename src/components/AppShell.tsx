import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, BookOpen, LayoutDashboard, Users, Settings } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import NotificationBell from "@/components/NotificationBell";

export default function AppShell({ children }: { children: ReactNode }) {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="container flex h-14 items-center gap-3">
          <Link to={role === "admin" ? "/admin" : "/dashboard"} className="flex items-center gap-2 font-display font-bold text-lg text-primary shrink-0">
            <BookOpen className="h-5 w-5" />
            <span className="hidden sm:inline">AI Essentials</span>
          </Link>
          {user && (
            <>
              <div className="flex-1 flex justify-center">
                <SearchBar />
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <NotificationBell />
                {role === "admin" && (
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/admin"><Users className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Admin</span></Link>
                  </Button>
                )}
                {role !== "admin" && (
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/dashboard"><LayoutDashboard className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Dashboard</span></Link>
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
