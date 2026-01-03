---
allowed-tools: Bash(TZ=Asia/Tokyo date:*), Write, Read, Glob, Grep
argument-hint: <設計内容の説明>
description: 設計ドキュメントを作成する (project)
---

## 現在の状況

- 設計対象: $ARGUMENTS

## タスク

以下の手順で設計ドキュメントを作成してください：

1. **設計対象の確認**: `$ARGUMENTS` の内容を確認し、設計すべきスコープを把握する。設計対象が不明確な場合はユーザーに確認を取る。

2. **目的（Why）の明確化**: この設計・実装が必要な理由を明確にする。以下のいずれかの形式で言語化できるようにする：
   - 「（対象者）が（困っている状態）を解消するため」
   - 「（対象者）が（嬉しい状態）になるため」

   目的が明確でない場合は、必ずユーザーに質問して確認を取ること。設計ドキュメントの冒頭に「目的」セクションとして記載する。

3. **関連コード・ドキュメントの調査**: 設計に必要な既存コードやドキュメントを読み込み、現状を理解する。設計対象に応じて以下を参照する。
   - バックエンド（webapp/admin の server/contexts）関連の場合:
     - [docs/backend-architecture-guide.md](docs/backend-architecture-guide.md): バックエンドのアーキテクチャルール
   - admin の UI 関連の場合:
     - [docs/admin-ui-guidelines.md](docs/admin-ui-guidelines.md): UIコンポーネントのガイドライン
   - 政治資金収支報告書関連の場合:
     - [docs/reference/report-format.md](docs/reference/report-format.md): 政治資金収支報告書XMLの仕様
     - [docs/scope-by-2026Jan.md](docs/scope-by-2026Jan.md): 前提となる2026年1月までのスコープ

4. **エラーパターンの設計**（バックエンド関連の場合は必須）: [docs/backend-architecture-guide.md](docs/backend-architecture-guide.md) のセクション6.3「エラーハンドリング」に従い、以下を設計する。
   - エラーコードの定義（`as const` で型安全に、大文字スネークケース）
   - 拡張エラー型の定義（`path`, `code`, `message`, `severity` を含む）
   - error と warning の使い分け
   - リファレンス実装: `contexts/report/domain/types/validation.ts`

5. **ファイル作成**: 設計ドキュメントを作成する。
   - 保存場所: `docs/` 以下
   - ファイル名: `YYYYMMDD_HHMM_{日本語の作業内容}.md`
   - 日時は `TZ=Asia/Tokyo date +%Y%m%d_%H%M` で取得する
   - 例: `docs/20250815_1430_ユーザー認証システム設計.md`

6. **整合性チェック**: バックエンド関連の設計の場合、作成したドキュメントが [docs/backend-architecture-guide.md](docs/backend-architecture-guide.md) のアーキテクチャルールと矛盾していないかダブルチェックする。矛盾があれば修正する。

7. **完了報告**: 作成した設計ドキュメントのパスを報告し、ユーザーのレビューを待つ。そのまま実装に進んではならない。

## 注意事項

設計ドキュメントには以下の内容を含めないこと：

- **具体的な実装コード**: 設計書はアーキテクチャや仕様を記述するものであり、実装コードは含めない（ただし特殊なハック実装についてのコード片などはOK）
- **今後の展望**: ユーザーが明示的に言及していない将来的な拡張や改善案は記載しない
- **工数見積・所要期間**: 「〇週間かかる」「工数は〇人日」などの時間的な見積もりは記載しない
