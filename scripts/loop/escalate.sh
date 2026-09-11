#!/usr/bin/env bash
#
# decide.sh の JSON（標準入力）にある escalations / flags / nudges / unblocks を GitHub に反映する。
# LLM セッションを起動せずにランナーが行う唯一の書き込み。
#
#   escalations: PR にコメントし、紐づく Issue を loop:wip → loop:human に付け替える
#   flags:       Issue を loop:ready → loop:human に付け替えて理由をコメントする
#   nudges:      レート制限で未レビューのままの PR に `@coderabbitai review` を投げる
#   unblocks:    取り残された CodeRabbit の Request changes を dismiss し、PR に理由をコメントする
#
# 標準出力に反映した件数を "escalated=<n> flagged=<m> nudged=<k> unblocked=<j>" の形で 1 行出力する。

set -euo pipefail

decision="$(cat)"
escalated=0
flagged=0
nudged=0
unblocked=0

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

# 取り残された Request changes の dismiss。
# セッションには dismiss を禁じている（退けた根拠がスレッドに残らなくなるため）。ここで dismiss するのは
# 「指摘スレッドが全件 resolve 済みで、head に対する CodeRabbit のレビューも完了している」レビューだけで、
# 監査に必要な返信はスレッドに残っており、dismiss の理由も PR のコメントとして記録する。
if jq -e '(.unblocks // []) | length > 0' <<<"$decision" >/dev/null; then
  repo="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
  while IFS=$'\t' read -r pr review_id review_commit head reason; do
    [[ -z "$pr" ]] && continue
    message="🤖 ループが取り下げ: 指摘スレッドは全件返信・resolve 済みで、head ${head:0:8} に対する CodeRabbit のレビューも完了しています（新しい指摘なし）。レビュー時点の commit は ${review_commit:0:8}。"
    if ! gh api -X PUT "repos/${repo}/pulls/${pr}/reviews/${review_id}/dismissals" -f message="$message" >/dev/null; then
      echo "[escalate] PR #$pr の Request changes（review ${review_id}）を dismiss できませんでした" >&2
      continue
    fi
    gh pr comment "$pr" --body "🤖 CodeRabbit の Request changes（commit ${review_commit:0:8} 時点）をランナーが取り下げました。指摘スレッドは全件返信・resolve 済みで、head ${head:0:8} に対する CodeRabbit のレビューも完了していますが（新しい指摘なし）、APPROVED への切り替えが行われず auto-merge が止まっていたためです。退けた指摘の根拠は各スレッドの 🤖 返信を参照してください。" >/dev/null
    echo "[escalate] PR #$pr Request changes を dismiss reason=$reason" >&2
    unblocked=$((unblocked + 1))
  done < <(jq -r '.unblocks[]? | [.pr, .review_id, (.review_commit // ""), (.head // ""), .reason] | @tsv' <<<"$decision")
fi

echo "escalated=$escalated flagged=$flagged nudged=$nudged unblocked=$unblocked"
