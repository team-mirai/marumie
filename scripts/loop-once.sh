#!/usr/bin/env bash
#
# ループエンジニアリング: 1 tick を実行する
#
#   状態収集（scripts/loop/state.sh）→ 判定（scripts/loop/decide.sh）→ ランナー側のエスカレーション
#   → 必要なら LLM セッションを 1 つ起動（scripts/loop/run-session.sh）→ 結果の検証
#
# 状態の収集と「何をするか」の判定は決定論的なスクリプトが行い、LLM セッションは渡された 1 つの仕事だけをする。
# セッションは CI や CodeRabbit の結果を待たずに終了し、その結果は次の tick の状態収集で拾う。
#
# 使い方:
#   ./scripts/loop-once.sh [モデル]
#
# モデル:
#   opus   (デフォルト) Claude Code (claude -p /<コマンド> --model opus)
#   fable  Claude Code (claude -p /<コマンド> --model fable)
#   astra  Codex CLI (codex exec --model gpt-6-astra)
#
# 環境変数:
#   LOOP_LOG_FILE        ログの出力先（未指定なら .loop/logs/single-<時刻>.log）。
#                        同じ basename で <log>.state.json / <log>.decision.json も残す
#   LOOP_MAX_FIX_ROUNDS  CodeRabbit 対応の修正 push を何ラウンドまで許すか（decide.sh、デフォルト 2）
#
# 終了コード（loop.sh が読む）:
#   0 = SUCCESS     セッションが 1 つの仕事を終えた（PR 作成 / 修正 push / 指摘の処理）
#   1 = FAILED      一過性の失敗（ネットワーク、レート制限、結果行なし など）。ランナーは連続回数を数える
#   2 = NO_TASK     候補が無い
#   3 = ESCALATED   セッションを起動せずにエスカレーションだけを行った、またはセッションがエスカレーションした
#   4 = WAITING     in-flight の PR か依存待ちの Issue しか無い。ランナーが状態の変化を待って再実行する
#   5 = FAILED      決定論的な失敗（手順・ツール・設定の不整合）。再実行しても直らないので即停止する

set -uo pipefail

# 本体を main() に包み、bash に実行前へ全体をパースさせる。
# 実行中にこのファイル自体が書き換わっても、読み込み済みの定義で最後まで走る。
main() {
  cd "$(cd "$(dirname "$0")/.." && pwd)"
  local loop_dir="scripts/loop"

  # --- 引数: モデルの検証 ---
  model="${1:-opus}"
  case "$model" in
    opus|fable) ;;
    astra)
      if ! command -v codex >/dev/null 2>&1; then
        echo "[loop-once] astra には Codex CLI が必要です (npm install -g @openai/codex)。中断します。" >&2
        exit 5
      fi
      ;;
    *)
      echo "usage: $0 [opus|fable|astra]" >&2
      exit 5
      ;;
  esac
  for tool in gh jq; do
    if ! command -v "$tool" >/dev/null 2>&1; then
      echo "[loop-once] LOOP_RESULT: FAILED kind=deterministic reason=missing-$tool"
      exit 5
    fi
  done

  # --- 前処理: 作業ツリーの状態確認 ---
  if [[ -n "$(git status --porcelain)" ]]; then
    branch="$(git branch --show-current)"
    if [[ "$branch" == loop/* ]]; then
      # 前のセッションが中断して残した作業。退避して main に戻る
      echo "[loop-once] 前セッションの残骸を退避します: $branch"
      git stash push -u -m "loop-abandoned:$branch:$(date +%Y%m%d-%H%M%S)"
    else
      echo "[loop-once] 作業ツリーが汚れています (branch: $branch)。中断します。" >&2
      echo "[loop-once] LOOP_RESULT: FAILED kind=deterministic reason=dirty-tree"
      exit 5
    fi
  fi
  if ! git checkout -q main || ! git pull -q --ff-only origin main; then
    echo "[loop-once] LOOP_RESULT: FAILED kind=transient reason=git-sync"
    exit 1
  fi

  log_file="${LOOP_LOG_FILE:-.loop/logs/single-$(date +%Y%m%d-%H%M%S).log}"
  mkdir -p "$(dirname "$log_file")"
  local state_file="${log_file%.log}.state.json"
  local decision_file="${log_file%.log}.decision.json"

  # --- 状態収集と判定（決定論的） ---
  if ! "$loop_dir/state.sh" >"$state_file"; then
    echo "[loop-once] 状態収集に失敗しました" >&2
    echo "[loop-once] LOOP_RESULT: FAILED kind=transient reason=state-collection"
    exit 1
  fi
  if ! "$loop_dir/decide.sh" <"$state_file" >"$decision_file"; then
    echo "[loop-once] 判定に失敗しました（decide.sh のバグか state.sh の出力の不整合）" >&2
    echo "[loop-once] LOOP_RESULT: FAILED kind=deterministic reason=decide"
    exit 5
  fi

  local action target reason
  action="$(jq -r .action "$decision_file")"
  target="$(jq -r '.target // ""' "$decision_file")"
  reason="$(jq -r .reason "$decision_file")"
  echo "[loop-once] 状態: main=$(jq -r .main.ci "$state_file") prs=$(jq '.prs | length' "$state_file") ready=$(jq '.issues | length' "$state_file") startable=$(jq '[.issues[] | select(.startable)] | length' "$state_file")"
  echo "[loop-once] 判定: $action${target:+ #$target} ($reason)"

  # --- ランナー側のエスカレーション（セッション不要） ---
  local esc_summary
  esc_summary="$("$loop_dir/escalate.sh" <"$decision_file")" || {
    echo "[loop-once] LOOP_RESULT: FAILED kind=transient reason=escalate"
    exit 1
  }
  local escalated_any=false
  [[ "$esc_summary" != "escalated=0 flagged=0" ]] && escalated_any=true

  # --- セッションを起動しない結果 ---
  case "$action" in
    none)
      if $escalated_any; then
        echo "[loop-once] LOOP_RESULT: ESCALATED $esc_summary"; exit 3
      fi
      echo "[loop-once] LOOP_RESULT: NO_TASK"; exit 2 ;;
    wait)
      echo "[loop-once] LOOP_RESULT: WAITING prs=$(jq -c .waiting_on.prs "$decision_file") issues=$(jq -c .waiting_on.issues "$decision_file")"
      exit 4 ;;
    fix-main|fix-ci|resolve-coderabbit|implement) ;;
    *)
      echo "[loop-once] LOOP_RESULT: FAILED kind=deterministic reason=unknown-action-$action"; exit 5 ;;
  esac

  # --- セッションを 1 つ起動 ---
  local command_name head_before=""
  case "$action" in
    implement)          command_name="loop-implement" ;;
    fix-ci)             command_name="loop-fix-ci"
                        head_before="$(jq -r --argjson n "$target" '.prs[] | select(.number == $n) | .head' "$state_file")" ;;
    resolve-coderabbit) command_name="loop-resolve-coderabbit" ;;
    fix-main)           command_name="loop-fix-main" ;;
  esac
  echo "[loop-once] セッション開始: /$command_name $target (モデル: $model) → $log_file"
  "$loop_dir/run-session.sh" "$model" "$command_name" "$target" "$log_file"

  local result
  result="$(grep -Eo 'LOOP_RESULT: [A-Z_]+[^\r]*' "$log_file" | tail -1 || true)"
  if [[ -z "$result" ]]; then
    if grep -q 'セッション終了 (subtype: [a-z_]*, turns: 0,' "$log_file"; then
      # モデルが一度も呼ばれていない = スラッシュコマンドの ! 展開が失敗した等、再実行しても直らない
      echo "[loop-once] セッションが 0 ターンで終了しました。コマンド定義（.claude/commands/$command_name.md）の ! 展開が失敗している可能性があります" >&2
      echo "[loop-once] LOOP_RESULT: FAILED kind=deterministic reason=session-not-started"
      exit 5
    fi
    echo "[loop-once] LOOP_RESULT: FAILED kind=transient reason=no-result-line"
    exit 1
  fi
  echo "[loop-once] $result"

  case "$result" in
    "LOOP_RESULT: SUCCESS"*)
      if verify_success "$action" "$target" "$head_before"; then
        exit 0
      fi
      echo "[loop-once] LOOP_RESULT: FAILED kind=transient reason=verify-$action"
      exit 1 ;;
    "LOOP_RESULT: BLOCKED"*)  exit 3 ;;
    "LOOP_RESULT: FAILED kind=deterministic"*) exit 5 ;;
    *) exit 1 ;;
  esac
}

# セッションが SUCCESS と言った内容を GitHub 側で確認する（セッションの自己申告を信用しない）
verify_success() { # $1: action, $2: target, $3: head before session (fix-ci のみ)
  local action="$1" target="$2" head_before="$3"
  case "$action" in
    implement)
      local n
      n="$(gh pr list --state open --limit 100 --json headRefName \
        --jq "[.[] | select(.headRefName | startswith(\"loop/issue-$target-\"))] | length")"
      [[ "$n" -gt 0 ]] && return 0
      echo "[loop-once] 検証失敗: Issue #$target の PR (loop/issue-$target-*) が見つかりません" >&2
      return 1 ;;
    fix-ci)
      local head_after
      head_after="$(gh pr view "$target" --json headRefOid --jq .headRefOid)"
      [[ -n "$head_after" && "$head_after" != "$head_before" ]] && return 0
      echo "[loop-once] 検証失敗: PR #$target の head が変わっていません（push されていない）" >&2
      return 1 ;;
    resolve-coderabbit)
      local repo unresolved
      repo="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
      unresolved="$(gh api graphql -f query="query { repository(owner: \"${repo%/*}\", name: \"${repo#*/}\") { pullRequest(number: $target) { reviewThreads(first: 100) { nodes { isResolved comments(first: 1) { nodes { author { login } } } } } } } }" \
        --jq '[.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false and .comments.nodes[0].author.login == "coderabbitai")] | length')"
      [[ "$unresolved" == "0" ]] && return 0
      echo "[loop-once] 検証失敗: PR #$target に未解決の CodeRabbit スレッドが $unresolved 件残っています" >&2
      return 1 ;;
    fix-main)
      local n
      n="$(gh pr list --state open --limit 100 --json headRefName \
        --jq '[.[] | select(.headRefName | startswith("loop/fix-main-"))] | length')"
      [[ "$n" -gt 0 ]] && return 0
      echo "[loop-once] 検証失敗: main 修理の PR (loop/fix-main-*) が見つかりません" >&2
      return 1 ;;
  esac
  return 0
}

main "$@"
