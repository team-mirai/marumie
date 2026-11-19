---
name: Loop Task（メンテナ向け）
about: AIエージェントが1ループで自律実装するタスク。メンテナが起票し、内容を確認してから loop:ready を付ける
title: ''
labels: ''
assignees: ''
---

<!--
このテンプレートはメンテナ向けです。
起票後、内容を確認したうえで `loop:ready` ラベルを付けるとループの対象になります。
運用ルール: docs/loop-engineering.md
-->

## 目的（Why）

<!-- なぜこのタスクが必要か。「誰が」「どう嬉しいか」を1〜2文で -->

## 完了条件（Done）

<!-- 検証可能な形で。例:「XxxUseCase のユニットテストが通る」「/admin/reports に一覧が表示される」 -->

- [ ]

## やること（In scope）

-

## やらないこと（Out of scope）

<!-- ループの暴走を防ぐ最重要項目。隣接する作業を明示的に除外する -->

-

## マイグレーション（schema 変更を伴う場合のみ）

<!--
変更する model・カラムと型、既存データの変換方針を書く。
内容を確認したら loop:migration-approved を付けて loop:ready にする（開発環境は push 時点でマイグレーションが適用されるため、ここで承認する）。
schema 変更が無ければこの節は削除する
-->

## ヒント（任意）

<!-- 参照すべきファイル、ガイド、関連 Issue / PR -->

- アーキテクチャ: docs/backend-architecture-guide.md
- admin の UI: docs/admin-ui-guidelines.md
