# DonationAssembler 寄附者情報（Donor）実データ化設計

## 概要

`donation-assembler.ts` において、現状ダミー値を返している寄附者（donor）情報を、実際のDBから取得した値を返すよう修正する設計。

**対象ファイル**: `admin/src/server/contexts/report/application/services/donation-assembler.ts`

## 現状の課題

### findPersonalDonationTransactionsの現在の実装

[prisma-report-transaction.repository.ts:159-190](admin/src/server/contexts/report/infrastructure/repositories/prisma-report-transaction.repository.ts#L159-L190) において、寄附者情報がダミー値でハードコードされている：

```typescript
// 現状のコード（リポジトリ内）
return transactions.map((t) => ({
  transactionNo: t.transactionNo,
  transactionDate: t.transactionDate,
  debitAmount: Number(t.debitAmount),
  creditAmount: Number(t.creditAmount),
  memo: t.memo,
  // TODO: 寄附者テーブル作成後に実際の値を取得する
  donorName: "（仮）寄附者氏名",
  donorAddress: "（仮）東京都千代田区永田町1-1-1",
  donorOccupation: "（仮）会社員",
}));
```

## 参考実装: Counterpartパターン

経費（expense）のcounterpart（支払先）情報取得では、以下のパターンが採用されている：

### スキーマ構造（Counterpart）

```prisma
model Counterpart {
  id        BigInt   @id
  name      String   @db.VarChar(120)
  address   String?  @db.VarChar(120)
  transactionCounterparts TransactionCounterpart[]
}

model TransactionCounterpart {
  transactionId BigInt
  counterpartId BigInt
  transaction Transaction @relation(...)
  counterpart Counterpart @relation(...)
  @@unique([transactionId, counterpartId])
  @@unique([transactionId])  // 1取引に1つのcounterpartのみ
}
```

### Prismaクエリパターン（Counterpart）

```typescript
// findUtilityExpenseTransactions等での実装
const transactions = await this.prisma.transaction.findMany({
  where: { ... },
  select: {
    transactionNo: true,
    ...
    transactionCounterparts: {
      select: {
        counterpart: {
          select: {
            name: true,
            address: true,
          },
        },
      },
    },
  },
});

return transactions.map((t) => ({
  ...
  counterpartName: t.transactionCounterparts[0]?.counterpart.name ?? "",
  counterpartAddress: t.transactionCounterparts[0]?.counterpart.address ?? "",
}));
```

## Donorテーブル構造

Donorはcounterpartと同様の中間テーブルパターンで設計されている：

```prisma
model Donor {
  id                BigInt            @id @default(autoincrement())
  donorType         DonorType         @map("donor_type")
  name              String            @db.VarChar(120)
  address           String?           @db.VarChar(120)
  occupation        String?           @db.VarChar(50)
  transactionDonors TransactionDonor[]
  @@unique([name, address, donorType])
}

model TransactionDonor {
  transactionId BigInt
  donorId       BigInt
  transaction Transaction @relation(...)
  donor       Donor       @relation(...)
  @@unique([transactionId, donorId])
  @@unique([transactionId])  // 1取引に1つのdonorのみ
}

enum DonorType {
  individual          // 個人
  corporation         // 法人
  political_organization  // 政治団体
}
```

## 設計

### 変更対象

1. **リポジトリ実装** (`prisma-report-transaction.repository.ts`)
2. **ドメインモデル** (既存の `donation-transaction.ts` は変更不要)

### 1. PrismaReportTransactionRepository の修正

#### findPersonalDonationTransactions メソッド

Counterpartと同じパターンで、`transactionDonors` を JOIN して donor 情報を取得する。

**修正方針**:
- `transactionDonors` リレーションを select に追加
- 取得した donor 情報を `donorName`, `donorAddress`, `donorOccupation` にマッピング
- donor が紐付いていない場合は空文字を返す（counterpartと同様）

**Prismaクエリ変更**:

```
select に以下を追加:
- transactionDonors: {
    select: {
      donor: {
        select: {
          name: true,
          address: true,
          occupation: true,
        },
      },
    },
  }

マッピング変更:
- donorName: t.transactionDonors[0]?.donor.name ?? ""
- donorAddress: t.transactionDonors[0]?.donor.address ?? ""
- donorOccupation: t.transactionDonors[0]?.donor.occupation ?? ""
```

### 2. 既存インターフェースとの互換性

`PersonalDonationTransaction` インターフェース（[donation-transaction.ts:21-31](admin/src/server/contexts/report/domain/models/donation-transaction.ts#L21-L31)）は変更不要：

```typescript
export interface PersonalDonationTransaction {
  transactionNo: string;
  transactionDate: Date;
  debitAmount: number;
  creditAmount: number;
  memo: string | null;
  donorName: string;      // ← 既存フィールド
  donorAddress: string;   // ← 既存フィールド
  donorOccupation: string; // ← 既存フィールド
}
```

リポジトリ実装のみ変更すれば、donation-assembler.ts や donation-transaction.ts のドメインロジックは変更不要。

### 3. DonationAssembler への影響

DonationAssembler ([donation-assembler.ts](admin/src/server/contexts/report/application/services/donation-assembler.ts)) は変更不要。リポジトリインターフェースを通じてデータを取得しており、リポジトリ実装の変更により自動的に実データが取得される。

## 未紐付け時の挙動

Counterpartと同様に、donor が紐付いていない取引については空文字を返す：

| フィールド | 未紐付け時の値 |
|-----------|---------------|
| donorName | "" (空文字) |
| donorAddress | "" (空文字) |
| donorOccupation | "" (空文字) |

これにより：
- XMLエクスポート時のバリデーションで「寄附者氏名が入力されていません」等のエラーが検出される
- ユーザーはDonor紐付け画面で寄附者情報を設定する必要がある

## テストへの影響

[donation-assembler.test.ts](admin/tests/server/contexts/report/application/services/donation-assembler.test.ts) のテストは、モックリポジトリを使用しているため変更不要。

リポジトリ実装のテストを追加する場合は、`transactionDonors` リレーションを含むテストデータを用意する必要がある。

## 対象外（スコープ外）

以下は本設計のスコープ外：

1. **Donor紐付け管理UI**: 既存のCounterpart紐付け管理画面と同様のUI実装（別タスク）
2. **法人・政治団体からの寄附**: 今回は個人からの寄附（KUBUN1）のみ対象
3. **Donor登録機能**: Donorエンティティの作成・更新API（別タスク）

## まとめ

| レイヤー | ファイル | 変更内容 |
|---------|---------|---------|
| Infrastructure | `prisma-report-transaction.repository.ts` | `findPersonalDonationTransactions` にtransactionDonors JOIN追加 |
| Domain | `donation-transaction.ts` | 変更なし |
| Application | `donation-assembler.ts` | 変更なし |

リポジトリ実装の1メソッドのみの修正で、既存のアーキテクチャパターン（Counterpart）に準拠した形でDonor情報の実データ化を実現できる。
