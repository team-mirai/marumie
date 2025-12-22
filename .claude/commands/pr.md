---
allowed-tools: Bash(git:*), Bash(gh:*), Bash(npm:*)
argument-hint: [branch-name]
description: フィーチャーブランチを作成してPRを出す
---

## 現在の状況

- 現在のブランチ: !`git branch --show-current`
- 変更ファイル: !`git status --short`

## タスク

以下の手順でPRを作成してください：

1. **ブランチ作成**: 現在のブランチがdevelopやmainの場合、`$ARGUMENTS` という名前でフィーチャーブランチを作成してチェックアウトする。既にフィーチャーブランチにいる場合はそのまま使用する。

2. **品質チェック**: ソースコード（`.ts`、`.tsx`、`.js`、`.jsx`ファイル）への変更がある場合のみ、プロジェクトルートで以下を実行する。ドキュメントや設定ファイルのみの変更の場合はスキップ可。
   - `npm run typecheck`
   - `npm run lint`
   - `npm test`
   エラーがあれば修正してから次に進む。

3. **コミット**: 変更内容を確認し、適切なコミットメッセージでコミットする。コミットメッセージは変更内容を反映した簡潔なものにする。

4. **コンフリクト確認**: `git fetch origin` して、developとのマージ可能性を確認する（`bash -c 'git merge-tree $(git merge-base HEAD origin/develop) HEAD origin/develop'` でコンフリクトの有無を確認）。コンフリクトがある場合はユーザーに報告し、続行するか確認を取る。

5. **プッシュ**: リモートにプッシュする（`git push -u origin <branch-name>`）

6. **PR作成**: `gh pr create` でPRを作成する。`--base` オプションは付けない（デフォルトのベースブランチを使用）。

7. **完了報告**: 作成したPRのURLを報告する。

## 注意事項

- developやmainへの直接pushは禁止
- Prismaのマイグレーションを含む場合は、PRを出す前にユーザーに確認を取る
