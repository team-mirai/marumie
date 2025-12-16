import {
  ShadcnButton,
  ShadcnInput,
  ShadcnCard,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/client/components/ui";

export default function TestShadcnPage() {
  return (
    <div className="p-8 space-y-4">
      <ShadcnCard>
        <CardHeader>
          <CardTitle>shadcn/ui テスト</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ShadcnInput placeholder="テスト入力" />
          <div className="flex gap-2">
            <ShadcnButton>Primary</ShadcnButton>
            <ShadcnButton variant="secondary">Secondary</ShadcnButton>
            <ShadcnButton variant="destructive">Danger</ShadcnButton>
          </div>
        </CardContent>
      </ShadcnCard>
    </div>
  );
}
