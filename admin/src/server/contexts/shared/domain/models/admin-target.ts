export type AdminTarget = {
  key: string;
  name: string;
  year: number;
} & (
  | { kind: "political-organization"; organizationId: string }
  | { kind: "research-fund"; politicianId: string; bookId: string; draftCount: number }
);

export function targetDestination(target: AdminTarget): string {
  return target.kind === "research-fund"
    ? `/politicians/${target.politicianId}/books`
    : "/political-organizations";
}
