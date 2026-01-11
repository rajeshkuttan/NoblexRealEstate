import { useState } from "react";
import { Globe, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface LanguageToggleProps {
  currentLanguage: string;
  onLanguageChange: (language: string) => void;
}

const languages = [
  { code: "en", name: "English", flag: "🇺🇸", dir: "ltr" },
  { code: "ar", name: "العربية", flag: "🇦🇪", dir: "rtl" },
  { code: "ur", name: "اردو", flag: "🇵🇰", dir: "rtl" },
  { code: "hi", name: "हिन्दी", flag: "🇮🇳", dir: "ltr" },
  { code: "fr", name: "Français", flag: "🇫🇷", dir: "ltr" }
];

export default function LanguageToggle({ currentLanguage, onLanguageChange }: LanguageToggleProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentLang = languages.find(lang => lang.code === currentLanguage) || languages[0];

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2"
      >
        <Globe className="h-4 w-4" />
        <span className="text-lg">{currentLang.flag}</span>
        <span className="hidden sm:inline">{currentLang.name}</span>
      </Button>

      {isOpen && (
        <Card className="absolute top-12 right-0 z-50 w-64">
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <Languages className="h-4 w-4" />
                <span className="font-medium">Select Language</span>
              </div>
              
              {languages.map((language) => (
                <div
                  key={language.code}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted/50 ${
                    currentLanguage === language.code ? "bg-blue-50 border border-blue-200" : ""
                  }`}
                  onClick={() => {
                    onLanguageChange(language.code);
                    setIsOpen(false);
                  }}
                >
                  <span className="text-lg">{language.flag}</span>
                  <div className="flex-1">
                    <div className="font-medium">{language.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {language.dir === "rtl" ? "Right-to-Left" : "Left-to-Right"}
                    </div>
                  </div>
                  {currentLanguage === language.code && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      Active
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
