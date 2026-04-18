import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Droplets, LayoutGrid, LifeBuoy, ListChecks, LogOut, LogIn, Settings as SettingsIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { migrateGuestDataIfNeeded } from "@/lib/cloudStorage";
import { ThemeToggle } from "@/components/ThemeToggle";

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    if (user) migrateGuestDataIfNeeded(user.id);
  }, [user]);

  const initial = user?.email?.[0]?.toUpperCase() ?? "?";

  const navItems = [
    { to: "/", label: t("nav.home"), icon: LayoutGrid, end: true },
    { to: "/rescue", label: t("nav.rescue"), icon: LifeBuoy },
    { to: "/track", label: t("nav.track"), icon: ListChecks },
    { to: "/settings", label: t("nav.settings"), icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 border-b border-border/50 backdrop-blur-xl bg-background/60">
        <div className="container max-w-2xl flex items-center justify-between py-4">
          <div className="flex items-center gap-2.5">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-cyan flex items-center justify-center shadow-glow">
              <Droplets className="w-5 h-5 text-secondary-foreground" strokeWidth={2.5} />
            </div>
            <div className="leading-tight">
              <h1 className="text-base font-semibold tracking-tight">{t("app.title")}</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{t("app.tagline")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <>
                <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-xs font-semibold text-secondary">
                  {initial}
                </div>
                <Button variant="ghost" size="icon" onClick={signOut} aria-label={t("common.signOut")}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => navigate("/auth")} className="rounded-full">
                <LogIn className="w-3.5 h-3.5 mr-1.5" /> {t("common.signIn")}
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 container max-w-2xl py-6 pb-28">
        <Outlet key={location.pathname} />
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border/50 backdrop-blur-xl bg-background/80">
        <div className="container max-w-2xl grid grid-cols-4 py-2">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all",
                  isActive ? "text-secondary" : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center transition-all",
                    isActive ? "bg-secondary/15 shadow-glow" : "")}>
                    <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className="text-[11px] font-medium tracking-wide">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default Layout;
