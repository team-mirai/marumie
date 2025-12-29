"use client";
import "client-only";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/client/components/ui";
import type { Counterpart } from "@/server/contexts/report/domain/models/counterpart";
import type { TransactionWithCounterpart } from "@/server/contexts/report/domain/models/transaction-with-counterpart";
import { AssignWithCounterpartContent } from "./AssignWithCounterpartContent";

interface AssignCounterpartDialogProps {
  isOpen: boolean;
  transactions: TransactionWithCounterpart[];
  allCounterparts: Counterpart[];
  politicalOrganizationId: string;
  onClose: () => void;
  onSuccess: (count: number) => void;
}

export function AssignCounterpartDialog({
  isOpen,
  transactions,
  allCounterparts,
  politicalOrganizationId,
  onClose,
  onSuccess,
}: AssignCounterpartDialogProps) {
  if (!isOpen || transactions.length === 0) return null;

  const isBulk = transactions.length > 1;
  const title = isBulk ? "一括紐付け" : "取引先を紐付け";

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[85vw] w-full h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <AssignWithCounterpartContent
          transactions={transactions}
          allCounterparts={allCounterparts}
          politicalOrganizationId={politicalOrganizationId}
          onSuccess={onSuccess}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
