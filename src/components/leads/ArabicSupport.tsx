import { useState, useEffect } from "react";
import { Globe, Languages, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ArabicSupportProps {
  children: React.ReactNode;
  currentLanguage: string;
  onLanguageChange: (language: string) => void;
}

// Arabic translations for common UI elements
const translations = {
  en: {
    leads: "Leads",
    addLead: "Add Lead",
    analytics: "Analytics",
    search: "Search",
    filter: "Filter",
    sort: "Sort",
    view: "View",
    edit: "Edit",
    delete: "Delete",
    save: "Save",
    cancel: "Cancel",
    close: "Close",
    submit: "Submit",
    name: "Name",
    email: "Email",
    phone: "Phone",
    company: "Company",
    budget: "Budget",
    location: "Location",
    status: "Status",
    priority: "Priority",
    leadScore: "Lead Score",
    lastContact: "Last Contact",
    nextFollowUp: "Next Follow-up",
    actions: "Actions",
    totalLeads: "Total Leads",
    hotLeads: "Hot Leads",
    conversionRate: "Conversion Rate",
    avgLeadScore: "Average Lead Score"
  },
  ar: {
    leads: "العملاء المحتملين",
    addLead: "إضافة عميل محتمل",
    analytics: "التحليلات",
    search: "بحث",
    filter: "تصفية",
    sort: "ترتيب",
    view: "عرض",
    edit: "تعديل",
    delete: "حذف",
    save: "حفظ",
    cancel: "إلغاء",
    close: "إغلاق",
    submit: "إرسال",
    name: "الاسم",
    email: "البريد الإلكتروني",
    phone: "الهاتف",
    company: "الشركة",
    budget: "الميزانية",
    location: "الموقع",
    status: "الحالة",
    priority: "الأولوية",
    leadScore: "نقاط العميل",
    lastContact: "آخر اتصال",
    nextFollowUp: "المتابعة التالية",
    actions: "الإجراءات",
    totalLeads: "إجمالي العملاء",
    hotLeads: "العملاء الساخنون",
    conversionRate: "معدل التحويل",
    avgLeadScore: "متوسط نقاط العميل"
  }
};

// UAE-specific Arabic translations
const uaeTranslations = {
  en: {
    emirates: "Emirates",
    dubai: "Dubai",
    abuDhabi: "Abu Dhabi",
    sharjah: "Sharjah",
    ajman: "Ajman",
    rasAlKhaimah: "Ras Al Khaimah",
    fujairah: "Fujairah",
    ummAlQuwain: "Umm Al Quwain",
    emiratesId: "Emirates ID",
    visaStatus: "Visa Status",
    nationality: "Nationality",
    tradeLicense: "Trade License",
    bankStatement: "Bank Statement",
    salaryCertificate: "Salary Certificate",
    furnished: "Furnished",
    semiFurnished: "Semi-Furnished",
    unfurnished: "Unfurnished",
    apartment: "Apartment",
    villa: "Villa",
    office: "Office",
    retail: "Retail",
    warehouse: "Warehouse"
  },
  ar: {
    emirates: "الإمارات",
    dubai: "دبي",
    abuDhabi: "أبو ظبي",
    sharjah: "الشارقة",
    ajman: "عجمان",
    rasAlKhaimah: "رأس الخيمة",
    fujairah: "الفجيرة",
    ummAlQuwain: "أم القيوين",
    emiratesId: "هوية الإمارات",
    visaStatus: "حالة التأشيرة",
    nationality: "الجنسية",
    tradeLicense: "رخصة تجارية",
    bankStatement: "كشف حساب بنكي",
    salaryCertificate: "شهادة راتب",
    furnished: "مفروش",
    semiFurnished: "مفروش جزئياً",
    unfurnished: "غير مفروش",
    apartment: "شقة",
    villa: "فيلا",
    office: "مكتب",
    retail: "تجاري",
    warehouse: "مستودع"
  }
};

export default function ArabicSupport({ children, currentLanguage, onLanguageChange }: ArabicSupportProps) {
  const [isRTL, setIsRTL] = useState(currentLanguage === "ar");
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  useEffect(() => {
    setIsRTL(currentLanguage === "ar");
    // Apply RTL/LTR to document
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.documentElement.lang = currentLanguage;
  }, [currentLanguage, isRTL]);

  const getTranslation = (key: string) => {
    const translationSet = translations[currentLanguage as keyof typeof translations] || translations.en;
    return translationSet[key as keyof typeof translationSet] || key;
  };

  const getUaeTranslation = (key: string) => {
    const translationSet = uaeTranslations[currentLanguage as keyof typeof uaeTranslations] || uaeTranslations.en;
    return translationSet[key as keyof typeof translationSet] || key;
  };

  const languages = [
    { code: "en", name: "English", flag: "🇺🇸", dir: "ltr" },
    { code: "ar", name: "العربية", flag: "🇦🇪", dir: "rtl" }
  ];

  const currentLang = languages.find(lang => lang.code === currentLanguage) || languages[0];

  return (
    <div className={cn("min-h-screen", isRTL && "rtl")}>
      {/* Language Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLanguageMenu(!showLanguageMenu)}
            className="flex items-center gap-2 bg-white shadow-lg"
          >
            <Globe className="h-4 w-4" />
            <span className="text-lg">{currentLang.flag}</span>
            <span className="hidden sm:inline">{currentLang.name}</span>
          </Button>

          {showLanguageMenu && (
            <Card className="absolute top-12 right-0 z-50 w-64 shadow-xl">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Languages className="h-4 w-4" />
                  {getTranslation("selectLanguage")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {languages.map((language) => (
                    <div
                      key={language.code}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                        currentLanguage === language.code 
                          ? "bg-blue-50 border border-blue-200" 
                          : "hover:bg-muted/50"
                      )}
                      onClick={() => {
                        onLanguageChange(language.code);
                        setShowLanguageMenu(false);
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
      </div>

      {/* RTL/LTR Direction Indicators */}
      {isRTL && (
        <div className="fixed bottom-4 left-4 z-40">
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
            <ChevronRight className="h-3 w-3 mr-1" />
            RTL Mode
          </Badge>
        </div>
      )}

      {/* Main Content with RTL Support */}
      <div className={cn(
        "transition-all duration-300",
        isRTL && "rtl"
      )}>
        {children}
      </div>

      {/* RTL Layout Adjustments */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .rtl {
            direction: rtl;
          }
          
          .rtl .flex {
            flex-direction: row-reverse;
          }
          
          .rtl .text-left {
            text-align: right;
          }
          
          .rtl .text-right {
            text-align: left;
          }
          
          .rtl .ml-auto {
            margin-left: 0;
            margin-right: auto;
          }
          
          .rtl .mr-auto {
            margin-right: 0;
            margin-left: auto;
          }
          
          .rtl .pl-4 {
            padding-left: 0;
            padding-right: 1rem;
          }
          
          .rtl .pr-4 {
            padding-right: 0;
            padding-left: 1rem;
          }
          
          .rtl .border-l {
            border-left: none;
            border-right: 1px solid;
          }
          
          .rtl .border-r {
            border-right: none;
            border-left: 1px solid;
          }
          
          .rtl .rounded-l {
            border-top-left-radius: 0;
            border-bottom-left-radius: 0;
            border-top-right-radius: 0.25rem;
            border-bottom-right-radius: 0.25rem;
          }
          
          .rtl .rounded-r {
            border-top-right-radius: 0;
            border-bottom-right-radius: 0;
            border-top-left-radius: 0.25rem;
            border-bottom-left-radius: 0.25rem;
          }
          
          /* Arabic Font Support */
          .rtl * {
            font-family: 'Noto Sans Arabic', 'Cairo', 'Tajawal', 'Amiri', system-ui, sans-serif;
          }
          
          /* RTL Table Support */
          .rtl table {
            direction: rtl;
          }
          
          .rtl th,
          .rtl td {
            text-align: right;
          }
          
          /* RTL Form Support */
          .rtl input,
          .rtl textarea,
          .rtl select {
            text-align: right;
          }
          
          /* RTL Button Groups */
          .rtl .flex > button:first-child {
            border-top-left-radius: 0;
            border-bottom-left-radius: 0;
            border-top-right-radius: 0.25rem;
            border-bottom-right-radius: 0.25rem;
          }
          
          .rtl .flex > button:last-child {
            border-top-right-radius: 0;
            border-bottom-right-radius: 0;
            border-top-left-radius: 0.25rem;
            border-bottom-left-radius: 0.25rem;
          }
        `
      }} />
    </div>
  );
}

// Export translation functions for use in components
export const useTranslation = (currentLanguage: string) => {
  const getTranslation = (key: string) => {
    const translationSet = translations[currentLanguage as keyof typeof translations] || translations.en;
    return translationSet[key as keyof typeof translationSet] || key;
  };

  const getUaeTranslation = (key: string) => {
    const translationSet = uaeTranslations[currentLanguage as keyof typeof uaeTranslations] || uaeTranslations.en;
    return translationSet[key as keyof typeof translationSet] || key;
  };

  return { getTranslation, getUaeTranslation };
};
