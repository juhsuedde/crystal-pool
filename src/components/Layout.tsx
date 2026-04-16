import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Droplets, LayoutGrid, LifeBuoy, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Pools", icon: LayoutGrid, end: true },
  { to: "/rescue", label: "Rescue", icon: LifeBuoy },
  { to: "/track", label: "Track", icon: ListChecks },
];

const Layout = () => {
  const location = useLocation();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 border-b border-border/50 backdrop-blur-xl bg-background/60">
        <div className="container max-w-2xl flex items-center justify-between py-4">
          <div className="flex items-center gap-2.5">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-cyan flex items-center justify-center shadow-glow">
              <Droplets className="w-5 h-5 text-secondary-foreground" strokeWidth={2.5} />
            </div>
            <div className="leading-tight">
              <h1 className="text-base font-semibold tracking-tight">Crystal Pool</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Maintenance OS</p>
            </div>
          </div>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground px-2.5 py-1 rounded-full border border-border">Guest</span>
        </div>
      </header>

      <main className="flex-1 container max-w-2xl py-6 pb-28">
        <Outlet key={location.pathname} />
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border/50 backdrop-blur-xl bg-background/80">
        <div className="container max-w-2xl grid grid-cols-3 py-2">
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
