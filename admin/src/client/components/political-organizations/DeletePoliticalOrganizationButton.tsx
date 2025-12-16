"use client";

import { useState } from "react";
import { deletePoliticalOrganization } from "@/server/contexts/shared/presentation/actions/delete-political-organization";
import { ShadcnButton } from "@/client/components/ui";

interface DeletePoliticalOrganizationButtonProps {
  orgId: bigint;
  orgName: string;
}

export function DeletePoliticalOrganizationButton({
  orgId,
  orgName,
}: DeletePoliticalOrganizationButtonProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (
      !window.confirm(
        `政治団体「${orgName}」を削除してもよろしいですか？この操作は取り消せません。`,
      )
    ) {
      return;
    }

    try {
      setDeleting(true);
      const result = await deletePoliticalOrganization(orgId);

      if (result.success) {
        alert(result.message);
      } else {
        alert(result.message);
      }
    } catch (err) {
      alert(`エラー: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ShadcnButton
      type="button"
      variant="destructive"
      size="sm"
      onClick={handleDelete}
      disabled={deleting}
    >
      {deleting ? "削除中..." : "削除"}
    </ShadcnButton>
  );
}
