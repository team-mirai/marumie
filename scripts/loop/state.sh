#!/usr/bin/env bash
#
# ループの現在状態を 1 つの JSON にして標準出力に書く（読み取り専用。GitHub には何も書かない）。
# ランナー（loop-once.sh → decide.sh）はこれだけを見て「この tick で何をするか」を決める。
#
# 出力の形:
# {
#   "collected_at": "<ISO8601>",
#   "repo": "owner/name",
#   "main":   { "ci": "success|failure|in_progress|unknown", "title": "<最新 run のタイトル>" },
#   "prs":    [ {                                   # open な loop/* ブランチの PR
#       "number", "title", "branch", "head", "created_at",
#       "merge_state": "CLEAN|DIRTY|BLOCKED|BEHIND|UNSTABLE|UNKNOWN",
#       "review_decision": "|APPROVED|CHANGES_REQUESTED|REVIEW_REQUIRED",
#       "auto_merge": true|false,
#       "ci_complete": "SUCCESS|FAILURE|PENDING|MISSING|...",   # 必須チェック（CheckRun）
#       "coderabbit":  "SUCCESS|FAILURE|ERROR|PENDING|RATE_LIMITED|MISSING", # head のコミットステータス。
#                      # state が success でも説明が "rate limited" なら未レビューなので RATE_LIMITED にする
#       "coderabbit_note": "<コミットステータスの説明文>",
#       "head_committed_at": "<ISO8601>",
#       "nudged_at": "<head 以降に @coderabbitai review を投げた最新時刻>" | null,
#       "fix_rounds": <"fix: CodeRabbit" で始まるコミット数>,
#       "issue": { "number", "labels": [...], "escalated": true|false } | null,   # Closes で紐づく Issue
#       "threads": { "coderabbit_unresolved": n, "human_unresolved": n },
#       "coderabbit_review": { "id": <review の databaseId>, "commit": "<レビュー時点の head>" } | null
#                      # coderabbitai が出した有効な（dismiss されていない）Request changes
#   } ],
#   "issues": [ {                                   # open な loop:ready Issue
#       "number", "title", "author_association", "trusted", "unblock",
#       "deps": [ { "number", "status": "merged|open|closed-unmerged|unknown" } ],
#       "startable": true|false,   # trusted かつ deps が全部 merged
#       "waiting":   true|false,   # deps に open / unknown がある
#       "dead":      true|false    # deps に closed-unmerged がある（待っても成果物が来ない）
#   } ]
# }
#
# 依存の判定は Issue 本文の「#X のマージ後に着手」だけを根拠にし、#X の成果物が main にマージ済みかを
# GraphQL の closedByPullRequestsReferences で確認する（gh CLI のバージョンに依存しない）。

set -euo pipefail

repo="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
owner="${repo%/*}"
name="${repo#*/}"

# --- main の CI ---
main_json="$(gh run list --branch main --workflow ci.yml --limit 1 --json conclusion,status,displayTitle \
  --jq '(.[0] // {}) | {
      ci: (if . == {} then "unknown"
           elif .status != "completed" then "in_progress"
           else (.conclusion // "unknown") end),
      title: (.displayTitle // "")
    }')"

# --- open な loop PR ---
# commits は gh pr list に含めるとノード数上限に当たるので、loop PR に絞ったあと GraphQL で取る
prs_raw="$(gh pr list --state open --limit 100 \
  --json number,title,headRefName,headRefOid,createdAt,mergeStateStatus,reviewDecision,autoMergeRequest,statusCheckRollup \
  --jq '[.[] | select(.headRefName | startswith("loop/"))]')"

pr_extra='{}'
pr_numbers="$(jq -r '.[].number' <<<"$prs_raw")"
if [[ -n "$pr_numbers" ]]; then
  q="query { repository(owner: \"$owner\", name: \"$name\") {"
  for n in $pr_numbers; do
    q+=" pr$n: pullRequest(number: $n) {"
    q+="   closingIssuesReferences(first: 5) { nodes { number labels(first: 30) { nodes { name } } } }"
    q+="   reviewThreads(first: 100) { nodes { isResolved comments(first: 1) { nodes { author { login } } } } }"
    q+="   reviews(last: 20, states: [CHANGES_REQUESTED]) { nodes { databaseId author { login } commit { oid } } }"
    q+="   commits(last: 100) { nodes { commit { messageHeadline committedDate } } }"
    q+="   comments(last: 30) { nodes { body createdAt } }"
    q+=" }"
  done
  q+=" } }"
  pr_extra="$(gh api graphql -f query="$q" --jq '.data.repository')"
fi

# head の CodeRabbit コミットステータス（説明文が要る。レート制限時も state は success になる）
cr_status='{}'
for n in $pr_numbers; do
  head="$(jq -r --argjson n "$n" '.[] | select(.number == $n) | .headRefOid' <<<"$prs_raw")"
  st="$(gh api "repos/$repo/commits/$head/status" \
    --jq '[.statuses[] | select(.context == "CodeRabbit")] | first // {} | {state, description, updated_at}' 2>/dev/null || echo '{}')"
  cr_status="$(jq --argjson n "$n" --argjson st "$st" '. + {("pr\($n)"): $st}' <<<"$cr_status")"
done

prs_json="$(jq --argjson extra "$pr_extra" --argjson cr "$cr_status" '
  def check(nm):
    ([.statusCheckRollup[]? | select((.name // .context) == nm)] | first) as $c
    | if $c == null then "MISSING"
      elif $c.__typename == "CheckRun" then
        (if $c.status != "COMPLETED" then "PENDING" else ($c.conclusion // "PENDING") end)
      else ($c.state // "MISSING") end;
  map(
    ($extra["pr\(.number)"] // {}) as $x
    | ($cr["pr\(.number)"] // {}) as $st
    | ($x.closingIssuesReferences.nodes // [] | first) as $iss
    | ($x.reviewThreads.nodes // [] | map(select(.isResolved == false))) as $open
    | ($x.reviews.nodes // [] | map(select(.author.login == "coderabbitai")) | last) as $cr_review
    | ($x.commits.nodes // [] | last | .commit.committedDate // null) as $head_at
    | ([$x.comments.nodes[]? | select((.body | test("@coderabbitai review")) and $head_at != null and .createdAt > $head_at) | .createdAt] | max) as $nudged
    | {
        number, title,
        branch: .headRefName,
        head: .headRefOid,
        created_at: .createdAt,
        merge_state: .mergeStateStatus,
        review_decision: .reviewDecision,
        auto_merge: (.autoMergeRequest != null),
        ci_complete: check("ci-complete"),
        coderabbit: (if ($st.description // "" | test("rate limit"; "i")) then "RATE_LIMITED"
                     elif ($st.state // "") != "" then ($st.state | ascii_upcase)
                     else check("CodeRabbit") end),
        coderabbit_note: ($st.description // ""),
        head_committed_at: $head_at,
        nudged_at: $nudged,
        fix_rounds: ([$x.commits.nodes[]? | select(.commit.messageHeadline | startswith("fix: CodeRabbit"))] | length),
        issue: (if $iss == null then null else {
          number: $iss.number,
          labels: [$iss.labels.nodes[].name],
          escalated: ([$iss.labels.nodes[].name] | any(. == "loop:human" or . == "loop:blocked"))
        } end),
        threads: {
          coderabbit_unresolved: ([$open[] | select(.comments.nodes[0].author.login == "coderabbitai")] | length),
          human_unresolved:      ([$open[] | select(.comments.nodes[0].author.login != "coderabbitai")] | length)
        },
        coderabbit_review: (if $cr_review == null then null else {
          id: $cr_review.databaseId,
          commit: ($cr_review.commit.oid // "")
        } end)
      }
  ) | sort_by(.number)
' <<<"$prs_raw")"

# --- open な loop:ready Issue ---
issues_raw="$(gh api "repos/$repo/issues?labels=loop:ready&state=open&per_page=100" \
  --jq '[.[] | select(.pull_request == null) | {
      number, title, author_association,
      unblock: ([.labels[].name] | any(. == "loop:unblock")),
      deps: ([(.body // "") | scan("#([0-9]+) のマージ後に着手")[] | tonumber] | unique)
    }]')"

dep_extra='{}'
dep_numbers="$(jq -r '[.[].deps[]] | unique | .[]' <<<"$issues_raw")"
if [[ -n "$dep_numbers" ]]; then
  q="query { repository(owner: \"$owner\", name: \"$name\") {"
  for n in $dep_numbers; do
    q+=" d$n: issueOrPullRequest(number: $n) { __typename"
    q+="   ... on Issue { state stateReason closedByPullRequestsReferences(first: 10) { nodes { number merged baseRefName } } }"
    q+="   ... on PullRequest { state merged baseRefName }"
    q+=" }"
  done
  q+=" } }"
  # 存在しない番号が混ざると GraphQL はエラーを返すが data は部分的に返る。取れなかった依存は unknown にする
  dep_extra="$(gh api graphql -f query="$q" 2>/dev/null | jq '.data.repository // {}' || echo '{}')"
fi

issues_json="$(jq --argjson extra "$dep_extra" '
  def dep_status($d):
    if $d == null then "unknown"
    elif $d.__typename == "PullRequest" then
      (if ($d.merged and $d.baseRefName == "main") then "merged"
       elif $d.state == "OPEN" then "open"
       else "closed-unmerged" end)
    elif $d.state == "OPEN" then "open"
    elif ([$d.closedByPullRequestsReferences.nodes[]? | select(.merged and .baseRefName == "main")] | length) > 0 then "merged"
    elif $d.state == "CLOSED" then "closed-unmerged"
    else "unknown" end;
  map(
    (.deps | map({number: ., status: dep_status($extra["d\(.)"])})) as $deps
    | (.author_association | IN("OWNER", "MEMBER", "COLLABORATOR")) as $trusted
    | {
        number, title, author_association,
        trusted: $trusted,
        unblock,
        deps: $deps,
        startable: ($trusted and ($deps | all(.status == "merged"))),
        waiting:   ($deps | any(.status == "open" or .status == "unknown")),
        dead:      ($deps | any(.status == "closed-unmerged"))
      }
  ) | sort_by(.number)
' <<<"$issues_raw")"

jq -n \
  --arg collected_at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --arg repo "$repo" \
  --argjson main "$main_json" \
  --argjson prs "$prs_json" \
  --argjson issues "$issues_json" \
  '{collected_at: $collected_at, repo: $repo, main: $main, prs: $prs, issues: $issues}'
