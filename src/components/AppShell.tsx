import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, BookOpen, LayoutDashboard, Users } from "lucide-react";

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
        <div className="container flex h-14 items-center justify-between">
          <Link to={role === "admin" ? "/admin" : "/dashboard"} className="flex items-center gap-2 font-display font-bold text-lg text-primary">
            <BookOpen className="h-5 w-5" />
            <span>AI Essentials</span>
          </Link>
          {user && (
            <div className="flex items-center gap-2">
              {role === "admin" && (
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/admin"><Users className="h-4 w-4 mr-1" /> Admin</Link>
                </Button>
              )}
              {role !== "admin" && (
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/dashboard"><LayoutDashboard className="h-4 w-4 mr-1" /> Dashboard</Link>
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
