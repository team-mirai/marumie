#!/usr/bin/env bash
#
# ループエンジニアリング: N回ループランナー
#
# for文で scripts/loop-once.sh を繰り返し呼び、停止条件を管理する。
#
# 使い方:
#   ./scripts/loop.sh 10        # 最大10回ループ（夜間バッチ向け）
#   ./scripts/loop.sh 10 astra  # モデルを指定（opus / fable / astra、デフォルト: opus）
#
# 停止条件:
#   - loop:ready のIssueがなくなった (NO_TASK)
#   - 連続 MAX_CONSECUTIVE_FAILURES 回失敗した (FAILED)
#   - 連続 MAX_CONSECUTIVE_BLOCKED 回エスカレーションした (BLOCKED)
#   - 依存先のPRのマージ待ち (WAITING) が LOOP_MAX_WAIT_SECONDS を超えて続いた
#   - 指定回数に達した（WAITING は回数に数えない）
#
# WAITING は「着手できるIssueは無いが、レビュー中・CI待ちのPRがマージされれば着手できる」状態。
# LOOP_WAIT_SECONDS（デフォルト 300）待ってから再実行する。再実行時は修理モードが先に走るので、
# 待っている間に CodeRabbit の Request changes が付けばそこで処理される。
#
# 環境変数:
#   LOOP_WAIT_SECONDS      WAITING 時の待機秒数（デフォルト 300）
#   LOOP_MAX_WAIT_SECONDS  連続待機の上限秒数（デフォルト 7200）
#
# ログ: .loop/logs/<開始時刻>/loop-<試行番号>.log

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
MAX_CONSECUTIVE_BLOCKED=3
WAIT_SECONDS="${LOOP_WAIT_SECONDS:-300}"
MAX_WAIT_SECONDS="${LOOP_MAX_WAIT_SECONDS:-7200}"
RUN_ID="$(date +%Y%m%d-%H%M%S)"
LOG_DIR=".loop/logs/$RUN_ID"
mkdir -p "$LOG_DIR"

echo "== loop run $RUN_ID: 最大 $COUNT 回, モデル: $MODEL (ログ: $LOG_DIR) =="

consecutive_failures=0
consecutive_blocked=0
waited_seconds=0
completed=0
attempt=0
results=()

while ((completed < COUNT)); do
  attempt=$((attempt + 1))
  log_file="$LOG_DIR/loop-$attempt.log"
  echo ""
  echo "[loop $((completed + 1))/$COUNT] 開始 (試行 $attempt)"

  LOOP_LOG_FILE="$log_file" "$SCRIPT_DIR/loop-once.sh" "$MODEL"
  status=$?

  result="$(grep -Eo 'LOOP_RESULT: [A-Z_]+[^\r]*' "$log_file" 2>/dev/null | tail -1 || true)"
  if [[ -z "$result" ]]; then
    # NO_TASK はログファイル作成前に終了するため結果行がない。それ以外は起動失敗
    if ((status == 2)); then
      result="LOOP_RESULT: NO_TASK"
    else
      result="LOOP_RESULT: FAILED reason=no-result-line"
    fi
  fi
  results+=("[試行 $attempt] exit=$status $result")

  case "$status" in
    0) # SUCCESS
      consecutive_failures=0
      consecutive_blocked=0
      waited_seconds=0
      completed=$((completed + 1))
      ;;
    2) # NO_TASK
      echo "[loop] タスクがなくなりました。終了します。"
      break
      ;;
    3) # BLOCKED
      # Issue側にエスカレーション済みなので次のタスクに進んでよい。
      # ただし全Issueが片端から blocked になるような系統的な問題を疑い、連続したら止める
      consecutive_failures=0
      waited_seconds=0
      consecutive_blocked=$((consecutive_blocked + 1))
      completed=$((completed + 1))
      if ((consecutive_blocked >= MAX_CONSECUTIVE_BLOCKED)); then
        echo "連続 $consecutive_blocked 回エスカレーションしたため中断します。" >&2
        break
      fi
      ;;
    4) # WAITING
      # 着手できるIssueは無いが、依存先のPRがマージされれば着手できる。
      # レビュー中・CI待ちの間にループを終わらせず、待ってから再実行する（回数には数えない）
      consecutive_failures=0
      if ((waited_seconds >= MAX_WAIT_SECONDS)); then
        echo "依存先のマージ待ちが $((waited_seconds / 60)) 分を超えたため中断します（${result}）。" >&2
        break
      fi
      echo "[loop] 依存先のマージ待ち: ${result}。${WAIT_SECONDS}秒待って再実行します（累計 $((waited_seconds / 60)) 分）"
      sleep "$WAIT_SECONDS"
      waited_seconds=$((waited_seconds + WAIT_SECONDS))
      ;;
    *) # FAILED(1)
      # 環境起因の失敗が続く場合は無駄な消費を防ぐため停止する
      consecutive_failures=$((consecutive_failures + 1))
      completed=$((completed + 1))
      if ((consecutive_failures >= MAX_CONSECUTIVE_FAILURES)); then
        echo "連続 $consecutive_failures 回失敗したため中断します。" >&2
        break
      fi
      ;;
  esac
done

# --- 後処理: 次の作業をしやすいように main へ戻す ---
# ループが loop/* ブランチ上で終わっていると、そのまま次の作業を始めてしまいやすい。
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
echo "確認コマンド:"
echo "  gh pr list --state open                  # 未マージのPR"
echo "  gh issue list --label loop:blocked       # ブロック中"
echo "  gh issue list --label loop:human         # 人間の対応待ち"
echo "  git stash list | grep loop-abandoned     # 中断ループの退避作業（あれば）"
