import type { PoliticalOrganization } from "@/shared/models/political-organization";
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui";

interface PoliticalOrganizationSelectProps {
  organizations: PoliticalOrganization[];
  value: string;
  onValueChange: (value: string) => void;
  required?: boolean;
  /** ラベルを描画せず aria-label で代替する（ツールバー等でインライン配置する場合） */
  hideLabel?: boolean;
}

export function PoliticalOrganizationSelect({
  organizations,
  value,
  onValueChange,
  required,
  hideLabel = false,
}: PoliticalOrganizationSelectProps) {
  const options = organizations.map((org) => ({
    value: org.id,
    label: org.displayName,
  }));

  return (
    <div className={hideLabel ? undefined : "space-y-2"}>
      {!hideLabel && <Label>政治団体</Label>}
      <Select value={value} onValueChange={onValueChange} required={required}>
        <SelectTrigger
          aria-label={hideLabel ? "政治団体" : undefined}
          className={hideLabel ? "border-[1.5px] text-[13px]" : undefined}
        >
          <SelectValue placeholder="政治団体を選択してください" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
