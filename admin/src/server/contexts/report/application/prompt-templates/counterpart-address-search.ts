export const COUNTERPART_ADDRESS_SEARCH_PROMPT_ID = "counterpart-address-search-v1";

export function buildCounterpartAddressSearchPrompt(companyName: string, hint?: string): string {
  const hintPart = hint ? `検索ヒント: ${hint}\n` : "";

  return `あなたは日本の企業・団体の住所を調査する専門家です。

以下の会社・団体名から、本社または主たる事務所の住所を特定してください。

会社名: ${companyName}
${hintPart}
【重要な指示】
1. Web検索ツールを使って、公式サイト・法人番号データベース・会社情報サイトなどから住所を調査してください
2. 同名の会社が複数ある場合は、それぞれを候補として挙げてください
3. 各候補について、情報の信頼度を判断してください

【出力形式】
以下のJSON形式で出力してください。必ず有効なJSONのみを出力し、他のテキストは含めないでください。

{
  "candidates": [
    {
      "companyName": "正式な会社名",
      "postalCode": "〒XXX-XXXX形式の郵便番号 または null",
      "address": "都道府県から始まる住所",
      "confidence": "high | medium | low",
      "source": "情報源のURLまたは「法人番号データベース」「LLM知識」等の説明"
    }
  ],
  "searchQuery": "検索に使用したクエリ"
}

【confidence の基準】
- high: 公式サイトや法人番号データベースで確認できた
- medium: 複数の情報源で一致している、または信頼できるビジネス情報サイトで確認
- low: 単一の情報源のみ、または古い可能性がある情報

【注意】
- 候補は最大5件まで
- 自信度が高い順に並べる
- 住所が特定できない場合は空の配列を返す`;
}
