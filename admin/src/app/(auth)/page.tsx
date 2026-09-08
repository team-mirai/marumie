import { PageHeader } from "@/client/components/layout/PageHeader";

export default function Home() {
  return (
    <div>
      <PageHeader label="Dashboard" title="ダッシュボード" />
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">Use the left navigation to manage data.</p>
      </div>
    </div>
  );
}
