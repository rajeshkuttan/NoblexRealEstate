import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ListPaginationProps = {
  page: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  disabled?: boolean;
  className?: string;
  shellClassName?: string;
  size?: "default" | "sm";
};

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

export function ListPagination({
  page,
  totalPages,
  totalItems,
  itemsPerPage,
  itemLabel,
  onPageChange,
  onItemsPerPageChange,
  disabled = false,
  className,
  shellClassName,
  size = "default",
}: ListPaginationProps) {
  const safePage = Math.max(1, page);
  const safeTotalPages = Math.max(1, totalPages);
  const startItem = totalItems === 0 ? 0 : (safePage - 1) * itemsPerPage + 1;
  const endItem = totalItems === 0 ? 0 : Math.min(safePage * itemsPerPage, totalItems);

  return (
    <div className={cn(shellClassName ?? "uiux-table-shell mt-6", className)}>
      <div className="p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="text-sm text-muted-foreground">
          Showing <span className="font-medium">{startItem}</span> to{" "}
          <span className="font-medium">{endItem}</span> of{" "}
          <span className="font-medium">{totalItems}</span> {itemLabel}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value) => onItemsPerPageChange(parseInt(value, 10))}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((option) => (
                <SelectItem key={option} value={option.toString()}>
                  {option} per page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size={size}
              onClick={() => onPageChange(Math.max(1, safePage - 1))}
              disabled={disabled || safePage === 1}
            >
              Previous
            </Button>
            <span className="text-sm font-medium">
              Page {safePage} of {safeTotalPages}
            </span>
            <Button
              variant="outline"
              size={size}
              onClick={() => onPageChange(Math.min(safeTotalPages, safePage + 1))}
              disabled={disabled || safePage === safeTotalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
