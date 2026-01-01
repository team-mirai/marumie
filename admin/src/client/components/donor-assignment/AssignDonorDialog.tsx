"use client";
import "client-only";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/client/components/ui";
import type { Donor } from "@/server/contexts/report/domain/models/donor";
import type { TransactionWithDonor } from "@/server/contexts/report/domain/models/transaction-with-donor";
import { AssignWithDonorContent } from "./AssignWithDonorContent";

interface AssignDonorDialogProps {
  isOpen: boolean;
  transactions: TransactionWithDonor[];
  allDonors: Donor[];
  onClose: () => void;
  onSuccess: () => void;
}

export function AssignDonorDialog({
  isOpen,
  transactions,
  allDonors,
  onClose,
  onSuccess,
}: AssignDonorDialogProps) {
  if (!isOpen || transactions.length === 0) return null;

  const isBulk = transactions.length > 1;
  const title = isBulk ? "一括紐付け" : "寄付者を紐付け";

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

        <AssignWithDonorContent
          transactions={transactions}
          allDonors={allDonors}
          onSuccess={onSuccess}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
