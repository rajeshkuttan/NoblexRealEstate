import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { setStoredLanguage } from "@/i18n";
import i18n from "@/i18n";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LanguageToggleProps {
  /** @deprecated Language is read from global i18n */
  currentLanguage?: string;
  /** @deprecated Use global i18n.changeLanguage via this component */
  onLanguageChange?: (language: string) => void;
}

const languages = [
  { code: "en", name: "English", flag: "🇬🇧", dir: "ltr" },
  { code: "ar", name: "العربية", flag: "🇦🇪", dir: "rtl" },
];

export default function LanguageToggle(_props: LanguageToggleProps) {
  const { i18n: i18nInstance } = useTranslation();
  const currentLanguage = i18nInstance.language === "ar" ? "ar" : "en";
  const currentLang = languages.find((lang) => lang.code === currentLanguage) || languages[0];

  const switchLang = (code: string) => {
    void i18n.changeLanguage(code);
    setStoredLanguage(code as "en" | "ar");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span>{currentLang.flag}</span>
          <span className="hidden sm:inline">{currentLang.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            className={currentLanguage === language.code ? "bg-blue-50 border border-blue-200" : ""}
            onClick={() => switchLang(language.code)}
          >
            <span className="text-lg">{language.flag}</span>
            <div className="flex flex-col">
              <div className="font-medium">{language.name}</div>
              <div className="text-xs text-muted-foreground">
                {language.dir === "rtl" ? "Right-to-Left" : "Left-to-Right"}
              </div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
