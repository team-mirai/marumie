#!/usr/bin/env bash
#
# ループエンジニアリング: N 回ループランナー
#
# scripts/loop-once.sh（1 tick）を繰り返し呼び、停止条件を管理する。
#
# 使い方:
#   ./scripts/loop.sh 10        # SUCCESS が 10 回になるまで回す（夜間バッチ向け）
#   ./scripts/loop.sh 10 astra  # モデルを指定（opus / fable / astra、デフォルト: opus）
#
# 停止条件と終端結果（最後に LOOP_RUN_RESULT 行として出力する）:
#   COMPLETED            SUCCESS が指定回数に達した
#   NO_TASK              候補が無くなった
#   FAILED_LIMIT         一過性の失敗が連続 MAX_CONSECUTIVE_FAILURES 回続いた
#   FAILED_DETERMINISTIC 決定論的な失敗（手順・ツール・設定の不整合）。再実行しても直らないので即停止
#   ESCALATED_LIMIT      エスカレーションが連続 MAX_CONSECUTIVE_ESCALATED 回続いた（系統的な問題を疑う）
#   WAIT_TIMEOUT         状態が変わらないまま LOOP_MAX_WAIT_SECONDS を超えた
#   ATTEMPT_LIMIT        試行回数が上限（指定回数 × 4）に達した（安全弁）
#
# WAITING の扱い:
#   tick が WAITING（in-flight の PR か依存待ちの Issue しか無い）を返したら、LOOP_WAIT_SECONDS ごとに
#   state.sh で状態だけを取り直し、内容が変わった時点で次の tick を回す（sleep を決め打ちで長く取らない）。
#   CodeRabbit のレビュー到着や CI の完了は状態の変化として現れるので、次の tick がそれを拾う。
#
# 環境変数:
#   LOOP_WAIT_SECONDS      WAITING 時に状態を取り直す間隔（デフォルト 60）
#   LOOP_MAX_WAIT_SECONDS  状態が変わらないまま待つ上限（デフォルト 7200）
#   LOOP_MAX_FIX_ROUNDS    CodeRabbit 対応の修正ラウンド上限（loop-once.sh → decide.sh に渡る。デフォルト 2）
#
# ログ: .loop/logs/<開始時刻>/tick-<試行番号>.log（同名の .state.json / .decision.json も残る）

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."

COUNT="${1:-1}"
MODEL="${2:-opus}"
if ! [[ "$COUNT" =~ ^[1-9][0-9]*$ ]] || ! [[ "$MODEL" =~ ^(opus|fable|astra)$ ]]; then
  echo "usage: $0 [回数(正の整数)] [opus|fable|astra]" >&2
  exit 1
fi

MAX_CONSECUTIVE_FAILURES=2
MAX_CONSECUTIVE_ESCALATED=3
MAX_ATTEMPTS=$((COUNT * 4))
WAIT_SECONDS="${LOOP_WAIT_SECONDS:-60}"
MAX_WAIT_SECONDS="${LOOP_MAX_WAIT_SECONDS:-7200}"
RUN_ID="$(date +%Y%m%d-%H%M%S)"
LOG_DIR=".loop/logs/$RUN_ID"
mkdir -p "$LOG_DIR"

echo "== loop run $RUN_ID: SUCCESS $COUNT 回まで, モデル: $MODEL (ログ: $LOG_DIR) =="

state_fingerprint() {
  # collected_at 以外が同じなら「状態が変わっていない」とみなす
  "$SCRIPT_DIR/loop/state.sh" 2>/dev/null | jq -S 'del(.collected_at)' | shasum | cut -d' ' -f1
}

consecutive_failures=0
consecutive_escalated=0
waited_seconds=0
completed=0
attempt=0
stop_reason="COMPLETED"
results=()

while ((completed < COUNT)); do
  if ((attempt >= MAX_ATTEMPTS)); then
    stop_reason="ATTEMPT_LIMIT attempts=$attempt"
    break
  fi
  attempt=$((attempt + 1))
  log_file="$LOG_DIR/tick-$attempt.log"
  echo ""
  echo "[loop] tick $attempt (SUCCESS $completed/$COUNT)"

  LOOP_LOG_FILE="$log_file" "$SCRIPT_DIR/loop-once.sh" "$MODEL"
  status=$?

  result="$(grep -Eo 'LOOP_RESULT: [A-Z_]+[^\r]*' "$log_file" 2>/dev/null | tail -1 || true)"
  results+=("[tick $attempt] exit=$status ${result:-（結果行なし）}")

  case "$status" in
    0) # SUCCESS
      consecutive_failures=0
      consecutive_escalated=0
      waited_seconds=0
      completed=$((completed + 1))
      ;;
    2) # NO_TASK
      echo "[loop] 候補がなくなりました。終了します。"
      stop_reason="NO_TASK"
      break
      ;;
    3) # ESCALATED
      consecutive_failures=0
      waited_seconds=0
      consecutive_escalated=$((consecutive_escalated + 1))
      if ((consecutive_escalated >= MAX_CONSECUTIVE_ESCALATED)); then
        echo "[loop] 連続 $consecutive_escalated 回エスカレーションしたため中断します（系統的な問題を疑ってください）。" >&2
        stop_reason="ESCALATED_LIMIT escalated=$consecutive_escalated"
        break
      fi
      ;;
    4) # WAITING: 状態が変わるまで待つ
      consecutive_failures=0
      consecutive_escalated=0
      before="$(state_fingerprint)"
      echo "[loop] 待機: ${WAIT_SECONDS}秒ごとに状態を取り直し、変化したら次の tick を回します（累計 $((waited_seconds / 60)) 分）"
      while :; do
        if ((waited_seconds >= MAX_WAIT_SECONDS)); then
          break
        fi
        sleep "$WAIT_SECONDS"
        waited_seconds=$((waited_seconds + WAIT_SECONDS))
        after="$(state_fingerprint)"
        if [[ -n "$after" && "$after" != "$before" ]]; then
          echo "[loop] 状態が変わりました（累計 $((waited_seconds / 60)) 分）。次の tick を回します。"
          break
        fi
      done
      if ((waited_seconds >= MAX_WAIT_SECONDS)); then
        echo "[loop] 状態が変わらないまま $((waited_seconds / 60)) 分を超えたため中断します。" >&2
        stop_reason="WAIT_TIMEOUT waited=$((waited_seconds / 60))m"
        break
      fi
      ;;
    5) # FAILED (deterministic)
      echo "[loop] 決定論的な失敗のため中断します: ${result}" >&2
      stop_reason="FAILED_DETERMINISTIC"
      break
      ;;
    *) # FAILED (transient)
      consecutive_escalated=0
      waited_seconds=0
      consecutive_failures=$((consecutive_failures + 1))
      if ((consecutive_failures >= MAX_CONSECUTIVE_FAILURES)); then
        echo "[loop] 一過性の失敗が連続 $consecutive_failures 回続いたため中断します。" >&2
        stop_reason="FAILED_LIMIT failures=$consecutive_failures"
        break
      fi
      ;;
  esac
done

# --- 後処理: 次の作業をしやすいように main へ戻す ---
current_branch="$(git branch --show-current)"
if [[ "$current_branch" != "main" ]]; then
  if [[ -n "$(git status --porcelain)" ]]; then
    echo ""
    echo "[loop] 作業ツリーが汚れているため退避します (branch: $current_branch)"
    git stash push -u -m "loop-abandoned:$current_branch:$(date +%Y%m%d-%H%M%S)"
  fi
  echo ""
  if git checkout main; then
    echo "[loop] main に戻りました (元: $current_branch)"
  else
    echo "[loop] main に戻れませんでした。$current_branch のままです。" >&2
  fi
fi

echo ""
echo "== loop run $RUN_ID サマリ =="
printf '%s\n' "${results[@]}"
echo ""
echo "LOOP_RUN_RESULT: $stop_reason completed=$completed/$COUNT attempts=$attempt"
echo ""
echo "確認コマンド:"
echo "  ./scripts/loop/state.sh | jq                # いまの状態（main CI / loop PR / ready Issue）"
echo "  ./scripts/loop/state.sh | ./scripts/loop/decide.sh | jq   # 次の tick が何をするか"
echo "  gh issue list --label loop:human           # 人間の対応待ち"
echo "  gh issue list --label loop:wip             # 着手中（PR がマージされれば閉じる）"
echo "  git stash list | grep loop-abandoned       # 中断セッションの退避作業（あれば）"
