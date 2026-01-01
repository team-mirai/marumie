import type { PreviewDonorCsvRow } from "@/server/contexts/report/domain/models/preview-donor-csv-row";
import { DONOR_TYPE_LABELS } from "@/server/contexts/report/domain/models/donor";

interface DonorCsvRowProps {
  row: PreviewDonorCsvRow;
}

const STATUS_STYLES: Record<
  PreviewDonorCsvRow["status"],
  { bg: string; text: string; label: string }
> = {
  valid: { bg: "bg-green-500/20", text: "text-green-500", label: "正常" },
  invalid: { bg: "bg-red-500/20", text: "text-red-500", label: "エラー" },
  transaction_not_found: { bg: "bg-yellow-500/20", text: "text-yellow-500", label: "取引なし" },
  type_mismatch: { bg: "bg-orange-500/20", text: "text-orange-500", label: "種別不整合" },
};

export default function DonorCsvRow({ row }: DonorCsvRowProps) {
  const statusStyle = STATUS_STYLES[row.status];

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("ja-JP");
  };

  const formatAmount = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return "-";
    return amount.toLocaleString("ja-JP");
  };

  return (
    <tr className="border-b border-border hover:bg-white/5">
      <td className="px-2 py-3 text-sm">{row.rowNumber}</td>
      <td className="px-2 py-3">
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
        >
          {statusStyle.label}
        </span>
      </td>
      <td className="px-2 py-3 text-sm text-white">{row.transactionNo || "-"}</td>
      <td className="px-2 py-3 text-sm text-white">{row.name || "-"}</td>
      <td className="px-2 py-3 text-sm text-white">
        {row.donorType ? DONOR_TYPE_LABELS[row.donorType] : "-"}
      </td>
      <td className="px-2 py-3 text-sm text-white">{row.address || "-"}</td>
      <td className="px-2 py-3 text-sm text-white">{row.occupation || "-"}</td>
      <td className="px-2 py-3 text-sm text-white">
        {formatDate(row.transaction?.transactionDate)}
      </td>
      <td className="px-2 py-3 text-sm text-white">
        {row.transaction?.friendlyCategory || row.transaction?.categoryKey || "-"}
      </td>
      <td className="px-2 py-3 text-sm text-white text-right">
        {formatAmount(row.transaction?.creditAmount)}
      </td>
      <td className="px-2 py-3 text-sm">
        {row.errors.length > 0 && (
          <ul className="text-red-400 text-xs list-disc list-inside">
            {row.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}
        {row.transaction?.existingDonor && (
          <div className="text-yellow-400 text-xs mt-1">
            既存: {row.transaction.existingDonor.name} (
            {DONOR_TYPE_LABELS[row.transaction.existingDonor.donorType]})
          </div>
        )}
        {row.matchingDonor && (
          <div className="text-blue-400 text-xs mt-1">一致: {row.matchingDonor.name}</div>
        )}
      </td>
    </tr>
  );
}
