import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "light" ? "light" : "dark";

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-noblex-surface group-[.toaster]:text-noblex-platinum group-[.toaster]:border-noblex-border group-[.toaster]:shadow-noblex-dropdown group-[.toaster]:border-l-4",
          success: "group-[.toaster]:border-l-noblex-emerald",
          warning: "group-[.toaster]:border-l-noblex-amber",
          error: "group-[.toaster]:border-l-noblex-rose",
          info: "group-[.toaster]:border-l-noblex-sky",
          description: "group-[.toast]:text-noblex-silver",
          actionButton: "group-[.toast]:bg-noblex-gold group-[.toast]:text-noblex-obsidian",
          cancelButton: "group-[.toast]:bg-noblex-muted group-[.toast]:text-noblex-platinum",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
