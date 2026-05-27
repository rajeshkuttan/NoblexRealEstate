import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Search } from "lucide-react";

export type FilterField = {
  key: string;
  label: string;
  type: "search" | "select";
  placeholder?: string;
  options?: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
};

type Props = {
  fields: FilterField[];
};

export function PayrollFilterPanel({ fields }: Props) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          {fields.map((f) =>
            f.type === "search" ? (
              <div key={f.key} className="relative lg:col-span-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder={f.placeholder ?? "Search…"}
                  value={f.value}
                  onChange={(e) => f.onChange(e.target.value)}
                />
              </div>
            ) : (
              <div key={f.key}>
                <Select value={f.value || "__all__"} onValueChange={(v) => f.onChange(v === "__all__" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={f.label} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All {f.label}</SelectItem>
                    {(f.options ?? []).map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}
