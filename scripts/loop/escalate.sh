#!/usr/bin/env bash
#
# decide.sh の JSON（標準入力）にある escalations / flags を GitHub に反映する。
# LLM セッションを起動せずにランナーが行う唯一の書き込み。
#
#   escalations: PR にコメントし、紐づく Issue を loop:wip → loop:human に付け替える
#   flags:       Issue を loop:ready → loop:human に付け替えて理由をコメントする
#   nudges:      レート制限で未レビューのままの PR に `@coderabbitai review` を投げる
#
# 標準出力に反映した件数を "escalated=<n> flagged=<m> nudged=<k>" の形で 1 行出力する。

set -euo pipefail

decision="$(cat)"
escalated=0
flagged=0
nudged=0

while IFS=$'\t' read -r pr issue reason; do
  [[ -z "$pr" ]] && continue
  case "$reason" in
    human-review)
      body="🤖 人間のレビュースレッドが未解決のため、この PR はループの対象から外し人間に引き継ぎます。ループが自動で扱うのは coderabbitai のスレッドだけです。対応後、Issue を \`loop:ready\` に戻すとループが再開します。" ;;
    budget-exceeded)
      body="🤖 CodeRabbit 対応の修正ラウンドが上限（LOOP_MAX_FIX_ROUNDS）に達しても未解決の指摘が残っているため、この PR はループの対象から外し人間に引き継ぎます。残った指摘の判断をお願いします。PR は open のまま、auto-merge の予約も残しています。" ;;
    *)
      body="🤖 ループの対象から外し人間に引き継ぎます（reason=${reason}）。" ;;
  esac
  gh pr comment "$pr" --body "$body" >/dev/null
  if [[ -n "$issue" && "$issue" != "null" ]]; then
    gh issue edit "$issue" --remove-label "loop:wip" --add-label "loop:human" >/dev/null
    gh issue comment "$issue" --body "🤖 PR #${pr} を人間に引き継ぎました（reason=${reason}）。詳細は PR のコメントを参照してください。" >/dev/null
  fi
  echo "[escalate] PR #$pr (issue #$issue) → loop:human reason=$reason" >&2
  escalated=$((escalated + 1))
done < <(jq -r '.escalations[]? | [.pr, (.issue // ""), .reason] | @tsv' <<<"$decision")

while IFS=$'\t' read -r issue reason; do
  [[ -z "$issue" ]] && continue
  case "$reason" in
    untrusted-author)
      body="🤖 起票者がリポジトリのメンバーではないため、\`loop:ready\` を外しました。ループは OWNER / MEMBER / COLLABORATOR が起票した Issue だけを指示として読みます。内容を採用する場合は、メンテナが自分の言葉で書き直した Issue を新たに起票してください。" ;;
    dead-dependency)
      body="🤖 本文の「#X のマージ後に着手」で指定された依存先が、main にマージされないまま閉じています。待っても成果物が来ないため \`loop:human\` に切り替えました。依存の記述を直すか、依存先を再度進めてから \`loop:ready\` に戻してください。" ;;
    *)
      body="🤖 ループの対象から外しました（reason=${reason}）。" ;;
  esac
  gh issue edit "$issue" --remove-label "loop:ready" --add-label "loop:human" >/dev/null
  gh issue comment "$issue" --body "$body" >/dev/null
  echo "[escalate] Issue #$issue → loop:human reason=$reason" >&2
  flagged=$((flagged + 1))
done < <(jq -r '.flags[]? | [.issue, .reason] | @tsv' <<<"$decision")

while read -r pr; do
  [[ -z "$pr" ]] && continue
  gh pr comment "$pr" --body "@coderabbitai review" >/dev/null
  echo "[escalate] PR #$pr → @coderabbitai review（レート制限で head が未レビューのため再レビューを依頼）" >&2
  nudged=$((nudged + 1))
done < <(jq -r '.nudges[]?' <<<"$decision")

echo "escalated=$escalated flagged=$flagged nudged=$nudged"
