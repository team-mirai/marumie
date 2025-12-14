# DisplayTransaction 構造設計

## 概要

webapp において表示するトランザクション情報は、データベースの `Transaction` モデルから変換された表示用のデータ構造 `DisplayTransaction` を使用する。これにより、フロントエンドでの表示処理を簡素化し、パフォーマンスを向上させる。

## DisplayTransaction インターフェース

```typescript
export interface DisplayTransaction {
  id: string; // 元のTransaction IDをそのまま利用
  date: Date; // 日付（フィルタリングしやすいよう元のDate型を維持）
  yearmonth: string; // 年月 (例: "2025.08")
  transactionType: TransactionType; // 'income' | 'expense' | 'other'
  category: string; // 表示用カテゴリ名
  subcategory?: string; // サブカテゴリ（任意）
  tags?: string; // タグ情報をそのまま保持
  absAmount: number; // 金額（絶対値）
  amount: number; // 金額（支出時はマイナス値）
}
```
