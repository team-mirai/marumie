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
# セッションを起動せずにランナーが行うラベル操作は escalations / flags に列挙する:
#   escalations: 人間のレビュースレッドがある PR、修正ラウンドの予算を超えた PR → 紐づく Issue を loop:human に
#   flags:       起票者が信頼境界の外の Issue、依存先が未マージのまま閉じた Issue → loop:human に
#
# 出力の形:
# { "action": "fix-main|fix-ci|resolve-coderabbit|implement|wait|none", "target": <番号|null>, "reason": "...",
#   "escalations": [ { "pr", "issue", "reason": "human-review|budget-exceeded" } ],
#   "flags":       [ { "issue", "reason": "untrusted-author|dead-dependency" } ],
#   "waiting_on":  { "prs": [...], "issues": [...] } }
#
# 環境変数:
#   LOOP_MAX_FIX_ROUNDS  CodeRabbit 対応の修正 push を何ラウンドまで許すか（デフォルト 2）

set -euo pipefail

max_rounds="${LOOP_MAX_FIX_ROUNDS:-2}"

jq --argjson max_rounds "$max_rounds" '
  # エスカレーション済み（Issue が loop:human / loop:blocked）の PR はループの対象外
  (.prs | map(select(.issue == null or (.issue.escalated | not)))) as $prs

  | (
      [ $prs[] | select(.threads.human_unresolved > 0)
        | {pr: .number, issue: .issue.number, reason: "human-review"} ]
      + [ $prs[] | select(.threads.human_unresolved == 0
                          and .fix_rounds >= $max_rounds
                          and (.threads.coderabbit_unresolved > 0 or .review_decision == "CHANGES_REQUESTED"))
        | {pr: .number, issue: .issue.number, reason: "budget-exceeded"} ]
    ) as $escalations
  | ($escalations | map(.pr)) as $esc_prs
  | ($prs | map(select(.number as $n | ($esc_prs | index($n)) == null))) as $live

  | (
      [ $live[] | select(.ci_complete == "FAILURE" or .merge_state == "DIRTY")
        | {action: "fix-ci", target: .number,
           reason: (if .merge_state == "DIRTY" then "conflict with main" else "ci-complete failed" end)} ]
      + [ $live[] | select(.ci_complete != "FAILURE" and .merge_state != "DIRTY"
                           and (.coderabbit | IN("SUCCESS", "FAILURE", "ERROR"))
                           and .threads.coderabbit_unresolved > 0)
        | {action: "resolve-coderabbit", target: .number,
           reason: "\(.threads.coderabbit_unresolved) unresolved CodeRabbit thread(s) on reviewed head"} ]
      | sort_by(.target)
    ) as $pr_actions
  | ($pr_actions | map(.target)) as $action_prs
  | ($live | map(select(.number as $n | ($action_prs | index($n)) == null)) | map(.number)) as $inflight

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
      waiting_on: {prs: $inflight, issues: $waiting_issues}
    }
'
