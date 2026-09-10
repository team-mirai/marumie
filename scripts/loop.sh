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
#   - 連続 MAX_CONSECUTIVE_FAILURES 回失敗した
#   - 指定回数に達した
#
# ログ: .loop/logs/<開始時刻>/loop-<i>.log

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
RUN_ID="$(date +%Y%m%d-%H%M%S)"
LOG_DIR=".loop/logs/$RUN_ID"
mkdir -p "$LOG_DIR"

echo "== loop run $RUN_ID: 最大 $COUNT 回, モデル: $MODEL (ログ: $LOG_DIR) =="

consecutive_failures=0
results=()

for ((i = 1; i <= COUNT; i++)); do
  log_file="$LOG_DIR/loop-$i.log"
  echo ""
  echo "[loop $i/$COUNT] 開始"

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
  results+=("[loop $i] exit=$status $result")

  case "$status" in
    0) # SUCCESS
      consecutive_failures=0
      ;;
    2) # NO_TASK
      echo "[loop $i/$COUNT] タスクがなくなりました。終了します。"
      break
      ;;
    *) # FAILED(1) / BLOCKED(3)
      # BLOCKED はIssue側にエスカレーション済みなので次のタスクに進んでよいが、
      # 環境起因の失敗が続く場合は無駄な消費を防ぐため停止する
      consecutive_failures=$((consecutive_failures + 1))
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
