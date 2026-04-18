import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { Globe, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { code: "en", label: "English (US)", flag: "🇺🇸" },
  { code: "pt-BR", label: "Português (Brasil)", flag: "🇧🇷" },
];

const Settings = () => {
  const { t, i18n } = useTranslation();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const changeLang = (code: string) => {
    i18n.changeLanguage(code);
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">{t("settings.title")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("settings.subtitle")}</p>
      </header>

      <section className="glass-card rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-secondary/15 flex items-center justify-center">
            <Globe className="w-4 h-4 text-secondary" />
          </div>
          <div>
            <h3 className="font-semibold">{t("settings.language")}</h3>
            <p className="text-xs text-muted-foreground">{t("settings.languageDesc")}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {LANGUAGES.map((lang) => {
            const active = i18n.resolvedLanguage === lang.code || i18n.language === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => changeLang(lang.code)}
                className={cn(
                  "flex items-center justify-between p-3.5 rounded-xl border transition-all text-left",
                  active
                    ? "bg-secondary/15 border-secondary text-foreground shadow-glow"
                    : "bg-card/50 border-border text-muted-foreground hover:text-foreground hover:border-secondary/40"
                )}
              >
                <span className="flex items-center gap-3">
                  <span className="text-2xl">{lang.flag}</span>
                  <span className="text-sm font-medium">{lang.label}</span>
                </span>
                {active && <span className="w-2 h-2 rounded-full bg-secondary" />}
              </button>
            );
          })}
        </div>
      </section>

      <section className="glass-card rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-secondary/15 flex items-center justify-center">
            {isDark ? <Moon className="w-4 h-4 text-secondary" /> : <Sun className="w-4 h-4 text-secondary" />}
          </div>
          <div>
            <h3 className="font-semibold">{t("settings.theme")}</h3>
            <p className="text-xs text-muted-foreground">{t("settings.themeDesc")}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setTheme("light")}
            className={cn(
              "flex items-center gap-3 p-3.5 rounded-xl border transition-all",
              !isDark
                ? "bg-secondary/15 border-secondary text-foreground shadow-glow"
                : "bg-card/50 border-border text-muted-foreground hover:text-foreground hover:border-secondary/40"
            )}
          >
            <Sun className="w-4 h-4" />
            <span className="text-sm font-medium">{t("settings.light")}</span>
          </button>
          <button
            onClick={() => setTheme("dark")}
            className={cn(
              "flex items-center gap-3 p-3.5 rounded-xl border transition-all",
              isDark
                ? "bg-secondary/15 border-secondary text-foreground shadow-glow"
                : "bg-card/50 border-border text-muted-foreground hover:text-foreground hover:border-secondary/40"
            )}
          >
            <Moon className="w-4 h-4" />
            <span className="text-sm font-medium">{t("settings.dark")}</span>
          </button>
        </div>
      </section>
    </div>
  );
};

export default Settings;
