# assignCounterpartAction を bulkAssignCounterpartAction に統一する設計

## 背景・課題

取引先紐付け機能において、単一トランザクション用の `assignCounterpartAction` と複数トランザクション用の `bulkAssignCounterpartAction` が別々に存在している。

### なぜ統一するのか

1. **bulk版で単一ケースも対応可能**
   - `BulkAssignCounterpartUsecase` は配列が1件でも正常に動作する
   - 単一用の別実装を持つ必要がない

2. **重複コードの削減**
   - 2つのUsecase/Actionで同様のロジック（ID検証、counterpart存在確認、upsert処理）が重複している
   - メンテナンス対象が2倍になっている

3. **呼び出し側の分岐が不要になる**
   - 現在 `AssignWithCounterpartContent.tsx` で `isBulk` 分岐を書いているが、統一すればこの分岐が不要
   - コードがシンプルになり、バグの入り込む余地が減る

## 削除対象

- `admin/src/server/contexts/report/presentation/actions/assign-counterpart.ts`
- `admin/src/server/contexts/report/application/usecases/assign-counterpart-usecase.ts`

## 変更対象

- `admin/src/client/components/counterpart-assignment/AssignWithCounterpartContent.tsx`
  - `assignCounterpartAction` の import を削除
  - `isBulk` 分岐を削除し、常に `bulkAssignCounterpartAction` を使用

## 影響範囲

- `AssignWithCounterpartContent.tsx` のみ
- 他のファイルでの `assignCounterpartAction` 使用はなし（Grep調査済み）
