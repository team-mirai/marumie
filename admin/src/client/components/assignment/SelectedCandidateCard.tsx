import type { ReactNode } from "react";

interface SelectedCandidateCardProps {
  children: ReactNode;
}

/** 候補一覧の上に置く「選択中」の確認カード（teal 枠・accent 背景）。 */
export function SelectedCandidateCard({ children }: SelectedCandidateCardProps) {
  return (
    <div className="rounded-lg border border-primary bg-accent p-3">
      <p className="mb-1 text-[11px] font-semibold tracking-[0.06em] text-primary-active">選択中</p>
      {children}
    </div>
  );
}
