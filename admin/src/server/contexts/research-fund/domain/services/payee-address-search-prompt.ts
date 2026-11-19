/**
 * 支払先の住所検索で、版がまだ無い議員に使う議員室プロンプト（エディタの初期値）。
 * 政治資金の取引先の住所検索と同じ指示から、検索対象と出力形式（自動付加する部分）を除いたもの。
 */
export const DEFAULT_ADDRESS_SEARCH_PROMPT = `あなたは日本の企業・団体の住所を調査する専門家です。

以下の会社・団体名から、本社または主たる事務所の住所を特定してください。

【重要な指示】
1. Web検索ツールを使って、公式サイト・法人番号データベース・会社情報サイトなどから住所を調査してください
2. 同名の会社が複数ある場合は、それぞれを候補として挙げてください
3. 各候補について、情報の信頼度を判断してください

【confidence の基準】
- high: 公式サイトや法人番号データベースで確認できた
- medium: 複数の情報源で一致している、または信頼できるビジネス情報サイトで確認
- low: 単一の情報源のみ、または古い可能性がある情報

【注意】
- 候補は最大5件まで
- 自信度が高い順に並べる
- 住所が特定できない場合は空の配列を返す`;

/** プロンプトの画面で、自動付加される部分の差し込み位置を示す見本 */
const NAME_PLACEHOLDER = "（検索する名称）";
const HINT_PLACEHOLDER = "（検索ヒント。入力したときだけ付加）";

/**
 * システムが自動で付加する部分。検索対象の差し込みと、候補一覧として解析できる出力形式を指定する。
 * 議員室プロンプトをどう編集しても解析できる形で返るよう、出力形式は編集欄に置かない。
 */
export function buildAutomaticAddressSearchPrompt(
  name: string = NAME_PLACEHOLDER,
  hint: string | undefined = HINT_PLACEHOLDER,
): string {
  const hintPart = hint ? `検索ヒント: ${hint}\n` : "";
  return `会社名: ${name}
${hintPart}
【出力形式】
以下のJSON形式で出力してください。必ず有効なJSONのみを出力し、他のテキストは含めないでください。

{
  "candidates": [
    {
      "companyName": "登記上の法人名のみ（例: GO株式会社）",
      "postalCode": "〒XXX-XXXX形式の郵便番号 または null",
      "address": "都道府県から始まる住所",
      "confidence": "high | medium | low",
      "source": "情報源のURLまたは「法人番号データベース」「LLM知識」等の説明。同名の会社を見分けるための法人番号・事業内容などもここに書く"
    }
  ],
  "searchQuery": "検索に使用したクエリ"
}

【会社名の書き方】
- companyName には登記上の法人名だけを書いてください。この値はそのまま支払先の名称として登録されます
- 事業内容・法人番号・旧称・「前株のため別表記」などの注記を、括弧書きを含めて companyName に付け加えないでください
- 同名の会社を見分けるための情報（法人番号・事業内容など）は source に書いてください`;
}

/** 議員室プロンプトの後ろに、検索対象と出力形式を付加して検索に使うプロンプトにする */
export function buildPayeeAddressSearchPrompt(
  officePrompt: string,
  name: string,
  hint?: string,
): string {
  return `${officePrompt}\n\n${buildAutomaticAddressSearchPrompt(name, hint ?? "")}`;
}
