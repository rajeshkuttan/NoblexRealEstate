import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("noblex-skeleton", className)} {...props} />;
}

export { Skeleton };
