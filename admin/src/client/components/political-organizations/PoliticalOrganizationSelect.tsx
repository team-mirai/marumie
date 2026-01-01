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
}

export function PoliticalOrganizationSelect({
  organizations,
  value,
  onValueChange,
  required,
}: PoliticalOrganizationSelectProps) {
  const options = organizations.map((org) => ({
    value: org.id,
    label: org.displayName,
  }));

  return (
    <div className="space-y-2">
      <Label>政治団体</Label>
      <Select value={value} onValueChange={onValueChange} required={required}>
        <SelectTrigger>
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
