"use client";

import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type LabeledSelectItem = {
  value: string;
  label: string;
  disabled?: boolean;
};

type LabeledSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  items: LabeledSelectItem[];
  placeholder?: string;
  triggerClassName?: string;
  disabled?: boolean;
};

export function LabeledSelect({
  value,
  onValueChange,
  items,
  placeholder = "Select…",
  triggerClassName,
  disabled,
}: LabeledSelectProps) {
  const selectedLabel = items.find((item) => item.value === value)?.label;

  return (
    <Select
      value={value}
      onValueChange={(v) => onValueChange(v ?? "")}
      items={items.map(({ value: itemValue, label }) => ({ value: itemValue, label }))}
      disabled={disabled}
    >
      <SelectTrigger className={cn("w-full", triggerClassName)}>
        <span
          className={cn(
            "flex-1 truncate text-left",
            !value && "text-muted-foreground",
          )}
        >
          {selectedLabel ?? placeholder}
        </span>
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value} disabled={item.disabled}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
