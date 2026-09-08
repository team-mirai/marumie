import type { PoliticalOrganization } from "@/shared/models/political-organization";
import { cn } from "@/client/lib";
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
  /** SelectTrigger に追加するクラス（幅や枠線の太さを配置先に合わせる場合） */
  className?: string;
}

export function PoliticalOrganizationSelect({
  organizations,
  value,
  onValueChange,
  required,
  hideLabel = false,
  className,
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
          className={cn(hideLabel && "border-[1.5px] text-[13px]", className)}
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
