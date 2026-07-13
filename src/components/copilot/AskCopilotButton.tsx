import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useCan } from "@/hooks/useCan";
import { useTranslation } from "react-i18next";

type AskCopilotButtonProps = {
  entityType: "property" | "unit" | "tenant" | "lease" | "ticket";
  entityId: number | string;
  module?: string;
  label?: string;
  presetQuestion?: string;
  variant?: "outline" | "secondary" | "ghost" | "default";
  size?: "sm" | "default" | "lg" | "icon";
  className?: string;
};

/**
 * Contextual deep-link into /copilot with server-validated entity context.
 */
export function AskCopilotButton({
  entityType,
  entityId,
  module,
  label,
  presetQuestion,
  variant = "outline",
  size = "sm",
  className,
}: AskCopilotButtonProps) {
  const can = useCan();
  const { t } = useTranslation();
  if (!can("module:copilot:use") || entityId == null || entityId === "") return null;

  const params = new URLSearchParams({
    entityType,
    entityId: String(entityId),
  });
  if (module) params.set("module", module);
  if (presetQuestion) params.set("q", presetQuestion);

  return (
    <Button variant={variant} size={size} className={className} asChild>
      <Link to={`/copilot?${params.toString()}`}>{label || t("copilot.askCopilot", "Ask Copilot")}</Link>
    </Button>
  );
}

export default AskCopilotButton;
