"use client";

import { useState } from "react";
import { deletePoliticalOrganization } from "@/server/contexts/shared/presentation/actions/delete-political-organization";

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
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className={`bg-red-600 text-white border-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-400 ${
        deleting
          ? "opacity-50 cursor-not-allowed"
          : "hover:bg-red-700 cursor-pointer"
      }`}
    >
      {deleting ? "削除中..." : "削除"}
    </button>
  );
}
