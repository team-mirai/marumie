#!/usr/bin/env bash
#
# state.sh の JSON を標準入力で受け取り、この tick で何をするかを JSON で標準出力に書く（副作用なし）。
#
# 判定順（上から最初に当たったもの）:
#   1. main の CI が赤        → fix-main（すでに loop/fix-main-* の PR が open ならそれは PR 側の規則で扱う）
#   2. 動かせる loop PR がある → fix-ci（必須チェック失敗・コンフリクト） / resolve-coderabbit（HEAD がレビュー済みで未解決スレッドあり）
#   3. 着手できる Issue がある → implement（loop:unblock 優先、次に番号最小。依存待ちは読み飛ばすだけ）
#   4. in-flight の PR か依存待ちの Issue がある → wait
#   5. それ以外            → none
#
# セッションを起動せずにランナーが行う GitHub への書き込みは escalations / flags / nudges / unblocks に列挙する:
#   escalations: 人間のレビュースレッドがある PR、修正ラウンドの予算を超えても未解決の指摘が残る PR → 紐づく Issue を loop:human に
#   flags:       起票者が信頼境界の外の Issue、依存先が未マージのまま閉じた Issue → loop:human に
#   nudges:      CodeRabbit がレート制限で head を未レビューのままの PR → `@coderabbitai review` を投げて再レビューを促す
#                （head ごとに 1 回。LOOP_NUDGE_INTERVAL_MINUTES 経っても未レビューなら再度）
#   unblocks:    CodeRabbit が head をレビューし終えて未解決スレッドも無いのに Request changes が立ったままの PR
#                → そのレビューを dismiss して auto-merge を通す（stale-changes-requested）。
#                本来は再レビューで APPROVED に切り替わるが、切り替わらないと auto-merge が永遠に止まる。
#                head が LOOP_STALE_REVIEW_MINUTES より新しいうちは切り替わりを待つ
#
# 出力の形:
# { "action": "fix-main|fix-ci|resolve-coderabbit|implement|wait|none", "target": <番号|null>, "reason": "...",
#   "escalations": [ { "pr", "issue", "reason": "human-review|budget-exceeded" } ],
#   "flags":       [ { "issue", "reason": "untrusted-author|dead-dependency" } ],
#   "nudges":      [ <PR番号> ],
#   "unblocks":    [ { "pr", "review_id", "review_commit", "head", "reason": "stale-changes-requested" } ],
#   "waiting_on":  { "prs": [...], "issues": [...] } }
#
# 環境変数:
#   LOOP_MAX_FIX_ROUNDS           CodeRabbit 対応の修正 push を何ラウンドまで許すか（デフォルト 2）
#   LOOP_NUDGE_INTERVAL_MINUTES   レート制限中の PR に再レビューを促す間隔（デフォルト 20）
#   LOOP_STALE_REVIEW_MINUTES     head がレビュー済みなのに Request changes が残るとき、dismiss するまで待つ時間（デフォルト 20）

set -euo pipefail

max_rounds="${LOOP_MAX_FIX_ROUNDS:-2}"
nudge_interval="${LOOP_NUDGE_INTERVAL_MINUTES:-20}"
stale_minutes="${LOOP_STALE_REVIEW_MINUTES:-20}"

jq --argjson max_rounds "$max_rounds" --argjson nudge_interval "$nudge_interval" --argjson stale_minutes "$stale_minutes" '
  # 取り残された Request changes:
  #   coderabbitai の有効な Request changes がある / 未解決スレッドが 1 つも無い / head の CodeRabbit レビューが完了している
  #   （レート制限なら nudges、レビュー中なら待つ）/ head が LOOP_STALE_REVIEW_MINUTES 以上前のもの / 他に直すものが無い
  def stale_changes_requested:
    .coderabbit_review != null
    and .review_decision == "CHANGES_REQUESTED"
    and .threads.coderabbit_unresolved == 0
    and .threads.human_unresolved == 0
    and (.coderabbit | IN("SUCCESS", "FAILURE", "ERROR"))
    and .ci_complete != "FAILURE"
    and .merge_state != "DIRTY"
    and (.head_committed_at != null and ((now - (.head_committed_at | fromdateiso8601)) / 60) >= $stale_minutes);

  # エスカレーション済み（Issue が loop:human / loop:blocked）の PR はループの対象外
  (.prs | map(select(.issue == null or (.issue.escalated | not)))) as $prs

  # 予算超過は「未解決の指摘が残っている」ときだけ。指摘を全部裁いたあとに Request changes だけが残る状態は
  # レート制限（nudges）か取り残し（unblocks）であり、人間に渡す理由にはならない
  | (
      [ $prs[] | select(.threads.human_unresolved > 0)
        | {pr: .number, issue: .issue.number, reason: "human-review"} ]
      + [ $prs[] | select(.threads.human_unresolved == 0
                          and .fix_rounds >= $max_rounds
                          and .threads.coderabbit_unresolved > 0)
        | {pr: .number, issue: .issue.number, reason: "budget-exceeded"} ]
    ) as $escalations
  | ($escalations | map(.pr)) as $esc_prs
  | ($prs | map(select(.number as $n | ($esc_prs | index($n)) == null))) as $live

  | (
      [ $live[] | select(.ci_complete == "FAILURE" or .merge_state == "DIRTY")
        | {action: "fix-ci", target: .number,
           reason: (if .merge_state == "DIRTY" then "conflict with main" else "ci-complete failed" end)} ]
      + [ $live[] | select(.ci_complete != "FAILURE" and .merge_state != "DIRTY"
                           and (.coderabbit | IN("SUCCESS", "FAILURE", "ERROR", "RATE_LIMITED"))
                           and .threads.coderabbit_unresolved > 0)
        | {action: "resolve-coderabbit", target: .number,
           reason: "\(.threads.coderabbit_unresolved) unresolved CodeRabbit thread(s) on reviewed head"} ]
      | sort_by(.target)
    ) as $pr_actions
  | ($pr_actions | map(.target)) as $action_prs
  | ($live | map(select(.number as $n | ($action_prs | index($n)) == null)) | map(.number)) as $inflight

  # レート制限で head が未レビューのままの PR: 再レビューを促す（head ごとに 1 回、間隔を空けて再送）
  | ([ $live[] | select(.coderabbit == "RATE_LIMITED" and .threads.coderabbit_unresolved == 0
                        and (.nudged_at == null or ((now - (.nudged_at | fromdateiso8601)) / 60) >= $nudge_interval))
        | .number ]) as $nudges

  # head はレビュー済み・指摘も全部裁いたのに Request changes が残っている PR: dismiss して auto-merge を通す
  | ([ $live[] | select(stale_changes_requested)
        | {pr: .number, review_id: .coderabbit_review.id, review_commit: .coderabbit_review.commit,
           head: .head, reason: "stale-changes-requested"} ]) as $unblocks

  | (
      [ .issues[] | select(.trusted | not) | {issue: .number, reason: "untrusted-author"} ]
      + [ .issues[] | select(.trusted and .dead) | {issue: .number, reason: "dead-dependency"} ]
    ) as $flags
  | ([ .issues[] | select(.startable) ] | sort_by([(.unblock | not), .number])) as $startable
  | ([ .issues[] | select(.trusted and (.startable | not) and (.dead | not)) | .number ]) as $waiting_issues

  | (
      if .main.ci == "failure" and ([$prs[] | select(.branch | startswith("loop/fix-main-"))] | length) == 0 then
        {action: "fix-main", target: null, reason: "main CI failed: \(.main.title)"}
      elif ($pr_actions | length) > 0 then
        $pr_actions[0]
      elif ($startable | length) > 0 then
        {action: "implement", target: $startable[0].number,
         reason: (if $startable[0].unblock then "loop:unblock issue" else "lowest ready issue whose deps are merged" end)}
      elif ($inflight | length) > 0 or ($waiting_issues | length) > 0 then
        {action: "wait", target: null, reason: "nothing actionable now"}
      else
        {action: "none", target: null, reason: "no candidates"}
      end
    ) as $decision

  | $decision + {
      escalations: $escalations,
      flags: $flags,
      nudges: $nudges,
      unblocks: $unblocks,
      waiting_on: {prs: $inflight, issues: $waiting_issues}
    }
'
