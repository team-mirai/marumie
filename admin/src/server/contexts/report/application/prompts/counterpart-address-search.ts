export const COUNTERPART_ADDRESS_SEARCH_PROMPT_ID = "counterpart-address-search-v1";

export interface CounterpartAddressSearchPromptVariables {
  companyName: string;
  hint?: string;
}

export function buildCounterpartAddressSearchPrompt(
  variables: CounterpartAddressSearchPromptVariables,
): string {
  const hintSection = variables.hint
    ? `
業態ヒント: ${variables.hint}
このヒントを参考に、同名企業がある場合は該当する業態の企業を優先してください。`
    : "";

  return `あなたは日本の企業・団体の住所を検索するアシスタントです。

以下の企業・団体の正式な住所を検索してください。

企業・団体名: ${variables.companyName}${hintSection}

## 検索方法
1. Web検索ツールを使用して、企業の公式サイト、法人番号データベース、その他の信頼できる情報源から住所を検索してください
2. 複数の候補がある場合は、最大5件まで自信度順に返してください
3. 各候補について、情報源（URL等）を明記してください

## 出力形式
以下のJSON形式で回答してください。必ず有効なJSONのみを出力し、それ以外のテキストは含めないでください。

{
  "candidates": [
    {
      "companyName": "正式な会社名",
      "postalCode": "郵便番号（例: 160-0023）またはnull",
      "address": "住所（都道府県から番地まで）",
      "confidence": "high" | "medium" | "low",
      "source": "情報源URL または 「法人番号データベース」「LLM知識」等"
    }
  ],
  "searchQuery": "検索に使用したクエリ"
}

## 自信度の基準
- high: 公式サイトや法人番号データベースで確認できた
- medium: 複数の情報源で一致している、または信頼性の高いサイトで確認できた
- low: 単一の情報源のみ、または情報が古い可能性がある

## 注意事項
- 同名の企業が複数存在する場合は、それぞれを別の候補として返してください
- 住所が見つからない場合は、空の candidates 配列を返してください
- 郵便番号が不明な場合は postalCode を null にしてください`;
}
