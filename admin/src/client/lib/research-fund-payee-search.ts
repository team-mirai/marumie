import type { Payee } from "@/server/contexts/research-fund/domain/models/payee";

/** 検索の比較用に、全角/半角（ｶﾅ・英数字）と大文字/小文字の違いを揃える */
function normalizeForSearch(value: string): string {
  return value.normalize("NFKC").toLowerCase();
}

/**
 * 支払先を、名前・住所・インボイス登録番号のいずれかに一致するものに絞り込む。
 * 空白で区切った語はすべて含まれる必要がある（「東京 タクシー」で東京のタクシー会社に絞れる）。
 * 空の検索語なら全件を返す。並び順は渡された順のまま。
 */
export function filterPayees<
  T extends Pick<Payee, "name" | "address" | "invoiceRegistrationNumber">,
>(payees: readonly T[], query: string): T[] {
  const terms = normalizeForSearch(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [...payees];
  return payees.filter((payee) => {
    const fields = [payee.name, payee.address, payee.invoiceRegistrationNumber ?? ""].map(
      normalizeForSearch,
    );
    return terms.every((term) => fields.some((field) => field.includes(term)));
  });
}
