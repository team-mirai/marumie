import { cn } from "@/client/lib";
import { RECEIPT_CATEGORIES } from "@/server/contexts/research-fund/domain/models/receipt-categories";

const colors: Record<keyof typeof RECEIPT_CATEGORIES, string> = {
  "pc-electronics": "bg-accent text-accent-foreground",
  "stationery-supplies": "bg-background text-foreground",
  taxi: "bg-accent text-accent-foreground",
  airfare: "bg-accent text-accent-foreground",
  housing: "bg-background text-muted-foreground",
  "public-transport": "bg-accent text-accent-foreground",
  "telecom-it": "bg-background text-foreground",
  lodging: "bg-accent text-accent-foreground",
  "books-newspapers": "bg-accent text-accent-foreground",
  "printing-pr": "bg-accent text-accent-foreground",
  "trip-arrangement": "bg-accent text-accent-foreground",
  utilities: "bg-background text-muted-foreground",
  hospitality: "bg-background text-foreground",
  "membership-fees": "bg-background text-foreground",
  postage: "bg-background text-foreground",
  "tolls-parking": "bg-accent text-accent-foreground",
  meetings: "bg-accent text-accent-foreground",
  "bank-fees": "bg-background text-muted-foreground",
  misc: "bg-background text-muted-foreground",
  personnel: "bg-background text-foreground",
  donation: "bg-background text-foreground",
};
export function ResearchFundCategoryPill({ accountKey }: { accountKey: string }) {
  const key = accountKey as keyof typeof RECEIPT_CATEGORIES;
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap rounded-full border px-3 py-0.5 text-xs font-medium",
        colors[key] ?? "border-destructive bg-destructive-hover text-destructive",
      )}
    >
      {RECEIPT_CATEGORIES[key]?.label ?? "要確認"}
    </span>
  );
}
