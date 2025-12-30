/**
 * 取引先推薦の Presentation 層型定義
 *
 * Application層の型をre-exportし、Client層からはこちらを参照する
 */

export type { CounterpartSuggestion } from "@/server/contexts/report/application/services/counterpart-suggester";
