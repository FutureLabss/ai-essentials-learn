import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
];

export default function LanguageSelector() {
  const { t, i18n } = useTranslation();

  const handleChange = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("app-language", lng);
  };

  return (
    <div className="rounded-lg border bg-card p-4 mb-6">
      <h3 className="font-display font-semibold text-sm mb-1">{t("settings.language")}</h3>
      <p className="text-xs text-muted-foreground mb-3">{t("settings.languageDesc")}</p>
      <Select value={i18n.language} onValueChange={handleChange}>
        <SelectTrigger className="h-8 text-sm w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LANGUAGES.map(l => (
            <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
