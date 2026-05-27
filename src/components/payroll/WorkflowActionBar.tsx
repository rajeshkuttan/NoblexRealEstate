import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useConfirm } from "@/hooks/use-confirm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type WorkflowAction = {
  id: string;
  label: string;
  onClick: () => void | Promise<void>;
  variant?: "default" | "destructive" | "outline" | "secondary";
  disabled?: boolean;
  hidden?: boolean;
  confirm?: { title: string; description: string };
  loading?: boolean;
};

type Props = {
  actions: WorkflowAction[];
};

export function WorkflowActionBar({ actions }: Props) {
  const { confirm, isOpen, options, onConfirm, onCancel } = useConfirm();
  const visible = actions.filter((a) => !a.hidden);

  const handleClick = async (action: WorkflowAction) => {
    if (action.confirm) {
      const ok = await confirm(action.confirm);
      if (!ok) return;
    }
    await action.onClick();
  };

  if (visible.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {visible.map((a) => (
          <Button
            key={a.id}
            variant={a.variant ?? "default"}
            size="sm"
            disabled={a.disabled || a.loading}
            onClick={() => handleClick(a)}
          >
            {a.loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {a.label}
          </Button>
        ))}
      </div>
      <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{options?.title}</AlertDialogTitle>
            <AlertDialogDescription>{options?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm}>{options?.confirmText ?? "Confirm"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
