"use client";
import "client-only";

import { useState } from "react";
import type { DonorWithUsage, DonorType } from "@/server/contexts/report/domain/models/donor";
import { createDonorAction } from "@/server/contexts/report/presentation/actions/create-donor";
import { updateDonorAction } from "@/server/contexts/report/presentation/actions/update-donor";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/client/components/ui";
import { DonorFormContent } from "@/client/components/donors/DonorFormContent";

type DonorFormDialogProps =
  | {
      mode: "create";
      onClose: () => void;
      onSuccess: () => void;
    }
  | {
      mode: "edit";
      donor: DonorWithUsage;
      onClose: () => void;
      onSuccess: () => void;
    };

export function DonorFormDialog(props: DonorFormDialogProps) {
  const { mode, onClose, onSuccess } = props;
  const donor = mode === "edit" ? props.donor : null;
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: {
    donorType: DonorType;
    name: string;
    address: string | null;
    occupation: string | null;
  }) => {
    setIsLoading(true);
    try {
      if (mode === "create") {
        const result = await createDonorAction({
          donorType: data.donorType,
          name: data.name,
          address: data.address,
          occupation: data.occupation,
        });

        if (!result.success) {
          throw new Error(result.errors?.join(", ") ?? "作成に失敗しました");
        }
      } else if (donor) {
        const result = await updateDonorAction(donor.id, {
          donorType: data.donorType,
          name: data.name,
          address: data.address,
          occupation: data.occupation,
        });

        if (!result.success) {
          throw new Error(result.errors?.join(", ") ?? "更新に失敗しました");
        }
      }
      onSuccess();
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isLoading) {
      onClose();
    }
  };

  const title = mode === "create" ? "新規寄付者作成" : "寄付者編集";

  return (
    <Dialog open={true} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[85vw] max-h-[85vh] w-full overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <DonorFormContent
          mode={mode}
          initialData={
            donor
              ? {
                  id: donor.id,
                  donorType: donor.donorType,
                  name: donor.name,
                  address: donor.address,
                  occupation: donor.occupation,
                  usageCount: donor.usageCount,
                }
              : undefined
          }
          onSubmit={handleSubmit}
          disabled={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
}
