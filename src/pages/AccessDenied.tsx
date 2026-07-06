import { ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function AccessDenied() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-4 max-w-md px-4">
        <ShieldAlert className="h-12 w-12 mx-auto text-destructive" />
        <h1 className="text-2xl font-semibold">{t("platform.accessDenied.title")}</h1>
        <p className="text-muted-foreground">
          {t("platform.accessDenied.subtitle")}
        </p>
        <Button onClick={() => navigate("/")}>Go to Dashboard</Button>
      </div>
    </div>
  );
}
