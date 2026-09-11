import type { PromptRecord } from "@/server/contexts/research-fund/domain/models/prompt";

export interface PromptRepository {
  /** 議員の全版を version の降順で返す */
  list(politicianId: string): Promise<PromptRecord[]>;
  /** 次の版を採番して保存し、有効版にする。採番した版番号を返す */
  create(politicianId: string, body: string, userId: string): Promise<number>;
  /** 既存の版を有効版にする（新しい版は作らない） */
  activate(politicianId: string, version: number): Promise<void>;
}
