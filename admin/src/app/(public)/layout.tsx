import "server-only";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <main className="h-screen bg-background">{children}</main>;
}
