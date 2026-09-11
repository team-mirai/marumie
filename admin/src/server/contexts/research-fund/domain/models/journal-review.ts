import { z } from "zod";
import type { JournalEntry } from "@/server/contexts/research-fund/domain/models/journal-entry";
import type {
  JournalLine,
  ResearchFundAccount,
} from "@/server/contexts/research-fund/domain/models/journal-posting";

export const journalEditSchema = z.object({
  entryDate: z.iso.date(),
  description: z.string().trim().min(1).max(255),
  amount: z.number().int().positive().max(999_999_999_999),
  accountKey: z.string().min(1).max(50),
  note: z.string(),
  memo: z.string(),
});
export type JournalEdit = z.infer<typeof journalEditSchema>;
export interface ReviewAccount extends ResearchFundAccount {
  label: string;
}
export interface ReviewEntry extends JournalEdit, JournalEntry {
  id: string;
  source: "scan" | "manual" | "grant";
  documentId: string | null;
  splitGroup: string | null;
  updatedAt: string;
  model: string | null;
  promptVersion: number | null;
}
export interface JournalWrite extends JournalEdit {
  hash: string;
  lines: readonly JournalLine[];
  status: ReviewEntry["status"];
}
export class JournalReviewError extends Error {}
