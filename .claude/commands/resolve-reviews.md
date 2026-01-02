---
allowed-tools: Bash(git:*), Bash(gh:*), Edit, Read, Glob, Grep
argument-hint: <PR番号>
description: 指定したPRの未解決レビューコメントに対応する
---

## 現在の状況

- 対象PR番号: $ARGUMENTS
- 現在のブランチ: !`git branch --show-current`

## タスク

以下の手順で指定されたPRの未解決レビューコメントに対応してください：

1. **PR情報の取得**: `gh pr view $ARGUMENTS` でPRの情報を取得し、PRが存在することを確認する。存在しない場合はエラーを報告して終了。

2. **ブランチの切り替え**: PRのブランチが現在のブランチと異なる場合は、`gh pr checkout $ARGUMENTS` でPRのブランチに切り替える。

3. **未解決レビューコメントの取得**: GraphQL APIを使用して、resolvedされていないレビュースレッドのみを取得する。
   ```
   gh api graphql -f query='query { repository(owner: "team-mirai", name: "marumie") { pullRequest(number: $ARGUMENTS) { reviewThreads(first: 100) { nodes { isResolved comments(first: 10) { nodes { id path line body author { login } } } } } } } }' --jq '.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false) | .comments.nodes[]'
   ```
   また、PRレビュー自体のコメント（CHANGES_REQUESTED や COMMENTED）も取得する。
   ```
   gh api repos/team-mirai/marumie/pulls/$ARGUMENTS/reviews --jq '.[] | select(.state == "CHANGES_REQUESTED" or .state == "COMMENTED") | {id: .id, body: .body, user: .user.login, state: .state}'
   ```
   **注意**: `isResolved == true` のスレッドは既に解決済みのため、対応不要として無視する。

4. **コメントの分析**: 取得したレビューコメントを分析し、対応が必要な項目をリストアップする。以下を考慮する。
   - 具体的なコード修正の指摘
   - 質問への回答が必要なもの
   - 設計に関するフィードバック

5. **対応の実施**: 各レビューコメントに対して以下のいずれかを行う。
   - **コード修正が必要な場合**: 指摘されたファイルを読み込み、修正を行う。修正前に関連するガイドラインを参照する（バックエンド関連なら `docs/backend-architecture-guide.md` など）。
   - **質問への回答が必要な場合**: ユーザーに回答内容を確認し、PRにコメントを追加する。
   - **対応不要または判断が必要な場合**: ユーザーに報告し、対応方針を確認する。

6. **変更のコミット**: 修正があれば、レビュー対応であることが分かるコミットメッセージでコミットする。
   例: `fix: address review comments on PR #$ARGUMENTS`

7. **プッシュ**: 変更をリモートにプッシュする。

8. **完了報告**: 対応した内容を以下の形式で報告する。

```
## レビュー対応完了

### 対応済み
- **[ファイル名:行番号]** 対応内容の説明

### 未対応（要確認）
- **コメントID: xxx** 理由: ...

### 次のアクション
- ...
```

## 注意事項

- **Resolvedされたコメントは無視する**: GitHub上でresolvedとしてマークされたレビュースレッドは対応済みとみなし、処理対象から除外する
- レビューコメントの意図が不明な場合は、勝手に解釈せずユーザーに確認を取る
- 大きな設計変更が必要な場合は、修正前にユーザーの承認を得る
- 修正後は `npm run typecheck` と `npm run lint` を実行し、エラーがないことを確認する
