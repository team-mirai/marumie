import { Button, Input, Card, CardContent, CardHeader, CardTitle } from "@/client/components/ui";

export default function TestShadcnPage() {
  return (
    <div className="p-8 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>shadcn/ui テスト</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="テスト入力" />
          <div className="flex gap-2">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="destructive">Danger</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
