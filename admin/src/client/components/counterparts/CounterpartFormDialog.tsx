"use client";
import "client-only";

import { useState } from "react";
import type { CounterpartWithUsage } from "@/server/contexts/report/domain/models/counterpart";
import { createCounterpartAction } from "@/server/contexts/report/presentation/actions/create-counterpart";
import { updateCounterpartAction } from "@/server/contexts/report/presentation/actions/update-counterpart";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/client/components/ui";
import { CounterpartFormContent } from "@/client/components/counterparts/CounterpartFormContent";

type CounterpartFormDialogProps =
  | {
      mode: "create";
      onClose: () => void;
      onSuccess: () => void;
    }
  | {
      mode: "edit";
      counterpart: CounterpartWithUsage;
      onClose: () => void;
      onSuccess: () => void;
    };

export function CounterpartFormDialog(props: CounterpartFormDialogProps) {
  const { mode, onClose, onSuccess } = props;
  const counterpart = mode === "edit" ? props.counterpart : null;
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: {
    name: string;
    postalCode: string | null;
    address: string | null;
  }) => {
    setIsLoading(true);
    try {
      if (mode === "create") {
        const result = await createCounterpartAction({
          name: data.name,
          postalCode: data.postalCode,
          address: data.address,
        });

        if (!result.success) {
          throw new Error(result.errors?.join(", ") ?? "作成に失敗しました");
        }
      } else if (counterpart) {
        const result = await updateCounterpartAction(counterpart.id, {
          name: data.name,
          postalCode: data.postalCode,
          address: data.address,
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

  const title = mode === "create" ? "新規取引先作成" : "取引先編集";

  return (
    <Dialog open={true} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[85vw] max-h-[85vh] w-full overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <CounterpartFormContent
          mode={mode}
          initialData={
            counterpart
              ? {
                  id: counterpart.id,
                  name: counterpart.name,
                  postalCode: counterpart.postalCode,
                  address: counterpart.address,
                  usageCount: counterpart.usageCount,
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
